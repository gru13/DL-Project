# import cv2
# import numpy as np
# from paddleocr import PaddleOCR
# import os

# def preprocess_image(image_path):
#     # Read the image
#     img = cv2.imread(image_path)
    
#     # Convert to grayscale
#     gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
#     # Apply thresholding to get binary image
#     _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
    
#     return img, binary

# def find_form_contours(binary):
#     # Find contours
#     contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
#     # Sort contours by area, descending
#     contours = sorted(contours, key=cv2.contourArea, reverse=True)
    
#     # Assume the largest contour is the form
#     form_contour = contours[0]
    
#     return form_contour

# def extract_form_template(img, form_contour):
#     # Create a mask for the form
#     mask = np.zeros(img.shape[:2], dtype=np.uint8)
#     cv2.drawContours(mask, [form_contour], 0, (255, 255, 255), -1)
    
#     # Apply the mask to the original image
#     form_template = cv2.bitwise_and(img, img, mask=mask)
    
#     return form_template

# def identify_form_fields(ocr_result):
#     fields = []
#     for line in ocr_result[0]:
#         box = line[0]
#         text = line[1][0]
#         if any(char.isalpha() for char in text):  # Only consider text fields
#             fields.append((box, text))
#     return fields

# def visualize_template_with_fields(template, fields):
#     result = template.copy()
#     for box, text in fields:
#         # Draw rectangles around text fields
#         pts = np.array(box, np.int32)
#         pts = pts.reshape((-1, 1, 2))
#         cv2.polylines(result, [pts], True, (0, 255, 0), 2)
        
#         # Add text labels
#         x, y = box[0]
#         cv2.putText(result, text, (int(x), int(y) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
    
#     return result

# def main(image_path):
#     # Initialize PaddleOCR
#     ocr = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False)
    
#     # Preprocess the image
#     img, binary = preprocess_image(image_path)
    
#     # Find form contours
#     form_contour = find_form_contours(binary)
    
#     # Extract form template
#     form_template = extract_form_template(img, form_contour)
    
#     # Perform OCR
#     ocr_result = ocr.ocr(image_path, rec=True, cls=True)
    
#     # Identify form fields
#     fields = identify_form_fields(ocr_result)
    
#     # Visualize template with fields
#     result = visualize_template_with_fields(form_template, fields)
    
#     # Save the result
#     output_path = os.path.splitext(image_path)[0] + "_template.jpg"
#     cv2.imwrite(output_path, result)
    
#     print(f"Template with fields saved to: {output_path}")

# # Usage
# image_path = "./NEFT.jpg"
# main(image_path)

import cv2
import numpy as np
from paddleocr import PaddleOCR
import os

def preprocess_image(image_path):
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
    return img, binary

def find_form_contours(binary):
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    form_contour = contours[0]
    return form_contour

def extract_form_template(img, form_contour):
    mask = np.zeros(img.shape[:2], dtype=np.uint8)
    cv2.drawContours(mask, [form_contour], 0, (255, 255, 255), -1)
    form_template = cv2.bitwise_and(img, img, mask=mask)
    return form_template

def identify_form_fields(ocr_result):
    fields = []
    for line in ocr_result:
        for word in line:
            box = word[0]
            text = word[1][0]
            if any(char.isalpha() for char in text):
                fields.append((box, text))
    return fields

def find_empty_regions(binary, fields):
    empty_regions = []
    for box, _ in fields:
        x, y, w, h = cv2.boundingRect(np.array(box, dtype=np.int32))
        roi = binary[y:y+h, x:x+w]
        if np.mean(roi) > 240:  # Assuming white background
            empty_regions.append((x, y, w, h))
    return empty_regions

def visualize_template_with_fields(template, fields, empty_regions):
    result = template.copy()
    
    # Draw rectangles around text fields
    for box, text in fields:
        pts = np.array(box, np.int32)
        pts = pts.reshape((-1, 1, 2))
        cv2.polylines(result, [pts], True, (0, 255, 0), 2)
        
        # Add text labels
        x, y = box[0]
        cv2.putText(result, text, (int(x), int(y) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
    
    # Draw rectangles around empty regions
    for x, y, w, h in empty_regions:
        cv2.rectangle(result, (x, y), (x+w, y+h), (255, 0, 0), 2)
    
    return result

def main(image_path):
    ocr = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False)
    
    img, binary = preprocess_image(image_path)
    form_contour = find_form_contours(binary)
    form_template = extract_form_template(img, form_contour)
    
    ocr_result = ocr.ocr(image_path, rec=True, cls=True)
    fields = identify_form_fields(ocr_result)
    
    empty_regions = find_empty_regions(binary, fields)
    
    result = visualize_template_with_fields(form_template, fields, empty_regions)
    
    output_path = os.path.splitext(image_path)[0] + "_template_with_fields.jpg"
    cv2.imwrite(output_path, result)
    
    print(f"Template with fields and empty regions saved to: {output_path}")

# Usage
image_path = "./NEFT.jpg"
main(image_path)
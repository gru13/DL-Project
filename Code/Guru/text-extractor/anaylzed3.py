import cv2
import numpy as np
from paddleocr import PaddleOCR
import json
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
    field_data = []

    for i, (box, text) in enumerate(fields):
        x, y, w, h = cv2.boundingRect(np.array(box, dtype=np.int32))
        cv2.rectangle(result, (x, y), (x+w, y+h), (0, 255, 0), 2)
        cv2.putText(result, f"{i+1}", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
        
        field_data.append({
            "id": i+1,
            "text": text,
            "bbox": [int(x), int(y), int(w), int(h)]
        })

    for i, (x, y, w, h) in enumerate(empty_regions):
        cv2.rectangle(result, (x, y), (x+w, y+h), (255, 0, 0), 2)
        cv2.putText(result, f"E{i+1}", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)
        
        field_data.append({
            "id": f"E{i+1}",
            "text": "Empty",
            "bbox": [int(x), int(y), int(w), int(h)]
        })

    return result, field_data

def main(image_path):
    ocr = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False)
    
    img, binary = preprocess_image(image_path)
    form_contour = find_form_contours(binary)
    form_template = extract_form_template(img, form_contour)
    
    ocr_result = ocr.ocr(image_path, rec=True, cls=True)
    fields = identify_form_fields(ocr_result)
    
    empty_regions = find_empty_regions(binary, fields)
    
    result, field_data = visualize_template_with_fields(form_template, fields, empty_regions)
    
    output_path = os.path.splitext(image_path)[0] + "_template_with_fields.png"
    cv2.imwrite(output_path, result)
    
    json_output = {
        "form_fields": field_data
    }
    
    json_path = os.path.splitext(image_path)[0] + "_field_data.json"
    with open(json_path, 'w') as f:
        json.dump(json_output, f, indent=2)
    
    print(f"Template with fields saved to: {output_path}")
    print(f"Field data saved to: {json_path}")

# Usage
image_path = "./NEFT.jpg"
main(image_path)
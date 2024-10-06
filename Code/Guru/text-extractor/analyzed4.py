import cv2
import pytesseract
import numpy as np

def extract_empty_text_boxes(image_path):
    """Extracts empty text boxes from a bank form image.

    Args:
        image_path (str): Path to the image file.

    Returns:
        list: A list of dictionaries, each representing a bounding box.
    """

    # Load the image
    img = cv2.imread(image_path)

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Apply thresholding to create a binary image
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Filter contours to find potential text boxes
    text_box_candidates = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        aspect_ratio = w / h
        if 0.5 <= aspect_ratio <= 2 and w > 20 and h > 20:
            text_box_candidates.append((x, y, w, h))

    # Perform OCR on potential text boxes
    text_boxes = []
    for x, y, w, h in text_box_candidates:
        roi = img[y:y+h, x:x+w]
        text = pytesseract.image_to_string(roi)
        if not text.strip():  # Empty text box
            text_boxes.append({'x1': x, 'y1': y, 'x2': x+w, 'y2': y+h})

    return text_boxes

def draw_bounding_boxes(image_path, bounding_boxes):
    """Draws bounding boxes on the image and saves the result.

    Args:
        image_path (str): Path to the image file.
        bounding_boxes (list): List of bounding box dictionaries.
    """

    img = cv2.imread(image_path)

    # Draw bounding boxes in neon green
    for box in bounding_boxes:
        cv2.rectangle(img, (box['x1'], box['y1']), (box['x2'], box['y2']), (0, 255, 255), 2)

    # Save the image
    cv2.imwrite('image_with_boxes.jpg', img)

# Example usage
image_path = './NEFT.jpg'
bounding_boxes = extract_empty_text_boxes(image_path)
draw_bounding_boxes(image_path, bounding_boxes)
import cv2
import numpy as np
import os

def preprocess_image(image_path):
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")
    
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Failed to read image: {image_path}")
    
    print(f"Image shape: {img.shape}")
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    return img, thresh

def find_empty_fields(thresh):
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    print(f"Number of contours found: {len(contours)}")
    
    empty_fields = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        aspect_ratio = w / float(h)
        if 0.9 <= aspect_ratio <= 1.1 and w >= 20 and h >= 20:
            roi = thresh[y:y+h, x:x+w]
            if np.sum(roi) / (w * h) < 50:
                empty_fields.append((x, y, w, h))
    
    print(f"Number of empty fields found: {len(empty_fields)}")
    return empty_fields

def group_fields(empty_fields):
    if not empty_fields:
        return []
    
    empty_fields.sort(key=lambda f: f[1])
    groups = []
    current_group = [empty_fields[0]]
    
    for field in empty_fields[1:]:
        last_field = current_group[-1]
        if abs(field[1] - last_field[1]) < 10:
            current_group.append(field)
        else:
            groups.append(current_group)
            current_group = [field]
    
    groups.append(current_group)
    print(f"Number of field groups: {len(groups)}")
    return groups

def draw_grouped_boxes(img, groups):
    for group in groups:
        x_min = min(field[0] for field in group)
        y_min = min(field[1] for field in group)
        x_max = max(field[0] + field[2] for field in group)
        y_max = max(field[1] + field[3] for field in group)
        
        cv2.rectangle(img, (x_min, y_min), (x_max, y_max), (0, 255, 0), 2)

def main(image_path):
    try:
        img, thresh = preprocess_image(image_path)
        empty_fields = find_empty_fields(thresh)
        grouped_fields = group_fields(empty_fields)
        draw_grouped_boxes(img, grouped_fields)
        
        result_path = 'result.jpg'
        cv2.imwrite(result_path, img)
        print(f"Processed image saved as '{result_path}'")
        
        # Display the result
        cv2.imshow('Result', img)
        cv2.waitKey(0)
        cv2.destroyAllWindows()
        
    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    image_path = "./NEFT.jpg"
    main(image_path)
import torch
import cv2
import numpy as np
import json
import yolov5

def detect_boxes(image_path, model):
    # Load image
    img = cv2.imread(image_path)
    
    # Perform inference
    results = model(img)
    
    # Extract bounding boxes
    boxes = results.xyxy[0].cpu().numpy()
    
    # Filter for 'box' class (assuming it's class 0)
    boxes = boxes[boxes[:, -1] == 0]
    
    return boxes

def boxes_to_json(boxes):
    box_list = []
    for box in boxes:
        box_dict = {
            "x1": int(box[0]),
            "y1": int(box[1]),
            "x2": int(box[2]),
            "y2": int(box[3]),
            "confidence": float(box[4])
        }
        box_list.append(box_dict)
    
    return json.dumps({"boxes": box_list})

def highlight_boxes(image_path, boxes):
    img = cv2.imread(image_path)
    for box in boxes:
        x1, y1, x2, y2 = map(int, box[:4])
        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
    return img

def main(image_path):
    # Load YOLOv5 model
    model = yolov5.load('yolov5s')
    model.classes = [0]  # Only detect class 0 (assuming 'box' is class 0)
    
    # Detect boxes
    boxes = detect_boxes(image_path, model)
    
    # Convert to JSON
    json_output = boxes_to_json(boxes)
    
    # Highlight boxes in image
    highlighted_image = highlight_boxes(image_path, boxes)
    
    # Save results
    output_image_path = 'output_image.jpg'
    cv2.imwrite(output_image_path, highlighted_image)
    
    with open('boxes.json', 'w') as f:
        f.write(json_output)
    
    print(f"Results saved to {output_image_path} and boxes.json")

if __name__ == "__main__":
    image_path = "./NEFT.jpg"  # Replace with your image path
    main(image_path)
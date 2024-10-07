import cv2
import numpy as np
import json
import uuid
from ultralytics import YOLO
from shapely.geometry import box
from shapely.ops import unary_union

# Load models
model_a = YOLO('./models/best-071024-2.pt')
model_b = YOLO('./models/best-071024-3.pt')

def extract_detections(results, model_name):
    detections = []
    for result in results:
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            confidence = float(box.conf[0])
            class_id = int(box.cls[0])
            
            detection = {
                'id': str(uuid.uuid4()),
                'source_model': model_name,
                'bbox': [float(x1), float(y1), float(x2), float(y2)],
                'confidence': confidence,
                'class_id': class_id
            }
            detections.append(detection)
    return detections

def calculate_iou(box1, box2):
    # Convert to shapely boxes
    box1_shape = box(*box1)
    box2_shape = box(*box2)
    
    if not box1_shape.intersects(box2_shape):
        return 0
    
    intersection = box1_shape.intersection(box2_shape).area
    union = box1_shape.union(box2_shape).area
    
    return intersection / union

def merge_boxes(boxes):
    if not boxes:
        return None
    
    shapely_boxes = [box(*b['bbox']) for b in boxes]
    merged_box = unary_union(shapely_boxes)
    bounds = merged_box.bounds
    
    # Find highest confidence among merged boxes
    max_confidence = max(b['confidence'] for b in boxes)
    
    # Combine source models
    source_models = sorted(list(set(b['source_model'] for b in boxes)))
    
    return {
        'id': str(uuid.uuid4()),
        'bbox': list(bounds),
        'confidence': max_confidence,
        'class_id': boxes[0]['class_id'],  # All boxes in the group have the same class
        'source_models': source_models
    }

def merge_detections(detections, iou_threshold=0.5):
    merged_results = []
    used_indices = set()

    for i, det1 in enumerate(detections):
        if i in used_indices:
            continue

        current_group = [det1]
        used_indices.add(i)

        for j, det2 in enumerate(detections):
            if j in used_indices or i == j:
                continue

            if (det1['class_id'] == det2['class_id'] and 
                calculate_iou(det1['bbox'], det2['bbox']) > iou_threshold):
                current_group.append(det2)
                used_indices.add(j)

        merged_box = merge_boxes(current_group)
        if merged_box:
            merged_results.append(merged_box)

    return merged_results

def process_image(image_path):
    # Run inference with both models
    results_a = model_a(image_path)
    results_b = model_b(image_path)
    
    # Extract detections from both models
    detections_a = extract_detections(results_a, 'model_a')
    detections_b = extract_detections(results_b, 'model_b')
    
    # Combine all detections
    all_detections = detections_a + detections_b
    
    # Merge overlapping detections
    merged_detections = merge_detections(all_detections)
    
    # Create the final JSON output
    json_output = {
        'image_path': image_path,
        'detections': merged_detections
    }
    
    # Draw boxes on image for visualization
    image = cv2.imread(image_path)
    colors = [(0, 255, 0), (255, 0, 0), (0, 0, 255)]  # Green, Blue, Red
    
    for det in merged_detections:
        x1, y1, x2, y2 = map(int, det['bbox'])
        color_index = len(det['source_models']) - 1
        color = colors[color_index]
        
        cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)
        label = f"Class {det['class_id']} ({det['confidence']:.2f})"
        source_label = f"Sources: {', '.join(det['source_models'])}"
        cv2.putText(image, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        cv2.putText(image, source_label, (x1, y1 - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
    
    return image, json_output

if __name__ == "__main__":
    image_path = './images/NEFT.jpg'
    output_image, json_output = process_image(image_path)
    
    # Save the output image
    cv2.imwrite('output_merged_detections.jpg', output_image)
    
    # Save JSON output
    with open('merged_detections.json', 'w') as f:
        json.dump(json_output, f, indent=2)
    
    print(f"Processed {len(json_output['detections'])} merged detections")
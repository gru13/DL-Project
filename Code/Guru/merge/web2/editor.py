from flask import Flask, request, jsonify, send_file, render_template
import cv2
import numpy as np
import json
import uuid
import os
from ultralytics import YOLO
from shapely.geometry import box
from shapely.ops import unary_union

app = Flask(__name__)

# Configure upload folder
UPLOAD_FOLDER = 'static/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Load YOLO models
model_a = YOLO('./models/best-071024-2.pt')
model_b = YOLO('./models/best-071024-3.pt')

labels = ['Detailed', 'EmptyInput', 'TableColumn', 'boxInput', 'checkBox', 'lineInput', 'signature']


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
                'class_name': labels[class_id]
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
    # Extract and merge detections
    # [Keep your existing detection extraction and merging logic here]
    
    # Generate a unique ID for this processing session
    session_id = str(uuid.uuid4())
    image = cv2.imread(image_path)
    # Save the processed image with the session ID
    output_image_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{session_id}_processed.jpg')
    cv2.imwrite(output_image_path, image)
    
    # Combine all detections
    all_detections = detections_a + detections_b
    
    merged_detections = merge_detections(all_detections)
    
    # Prepare JSON output
    json_output = {
        'session_id': session_id,
        'detections': merged_detections
    }
    
    # Save JSON with session ID
    json_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{session_id}_detections.json')
    with open(json_path, 'w') as f:
        json.dump(json_output, f, indent=2)
    
    return json_output, output_image_path

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        # Save the uploaded file
        input_path = os.path.join(app.config['UPLOAD_FOLDER'], f'input_{uuid.uuid4()}.jpg')
        file.save(input_path)
        
        # Process the image
        json_output, output_image_path = process_image(input_path)
        
        return jsonify({
            'session_id': json_output['session_id'],
            'message': 'File processed successfully'
        })

@app.route('/get_image/<session_id>')
def get_image(session_id):
    image_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{session_id}_processed.jpg')
    return send_file(image_path, mimetype='image/jpeg')

@app.route('/get_detections/<session_id>')
def get_detections(session_id):
    json_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{session_id}_detections.json')
    with open(json_path, 'r') as f:
        detections = json.load(f)
    return jsonify(detections)

@app.route('/save_modifications', methods=['POST'])
def save_modifications():
    data = request.json
    session_id = data['session_id']

    # Save modified JSON
    json_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{session_id}_detections_modified.json')
    with open(json_path, 'w') as f:
        json.dump(data, f, indent=2)

    return jsonify({'message': 'Modifications saved successfully'})

if __name__ == '__main__':
    app.run(debug=True)
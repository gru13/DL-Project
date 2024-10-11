from flask import Flask, request, jsonify, send_file, render_template, redirect, url_for
import os
import cv2
import json
import uuid
from paddleocr import PaddleOCR
from ultralytics import YOLO
import shutil

labels = ['Detailed', 'EmptyInput', 'TableColumn', 'boxInput', 'checkBox', 'lineInput', 'signature']
app = Flask(__name__)
ocr = PaddleOCR(lang='en', rec_image_shape="3,32,100", rec_batch_num=1, max_text_length=25, rec_algorithm='CRNN', use_gpu=True, rec_model_dir='./Models/ppocr_mobile_v4.0_rec_infer/')
YoloModel = YOLO("./Models/best-071024-4.pt")

output_dir = os.path.join(app.static_folder, 'output')
template_dir = os.path.join(app.static_folder, 'Templates')
os.makedirs(output_dir, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/paddleOCRrun', methods=['POST'])
def paddleOCRrun():
    image_file = request.files['image']
    image_name = image_file.filename
    img_path = os.path.join(output_dir, image_name)
    os.makedirs(template_dir+'/'+image_name, exist_ok=True)
    image_file.save(img_path)
    image_file.save(template_dir+'/'+image_name+'image.jpg')
    result = ocr.ocr(img_path)
    
    def convert_quad_to_rect(quad_bbox):
        x_coords = [point[0] for point in quad_bbox]
        y_coords = [point[1] for point in quad_bbox]
        return [min(x_coords), min(y_coords), max(x_coords), max(y_coords)]
    
    output = []
    img = cv2.imread(img_path)
    for line in result:
        for word_info in line:
            quad_bbox = word_info[0]
            text = word_info[1][0]
            confidence = word_info[1][1]
            
            quad_bbox = [[int(coord[0]), int(coord[1])] for coord in quad_bbox]
            rect_bbox = convert_quad_to_rect(quad_bbox)
            
            cv2.rectangle(img, (int(rect_bbox[0]), int(rect_bbox[1])), (int(rect_bbox[2]), int(rect_bbox[3])), (0, 255, 0), 2)
            
            entry_uuid = str(uuid.uuid4())
            output.append({
                "uuid": entry_uuid,
                "class": "Label",
                "confidence": confidence,
                "bbox": rect_bbox,
                "text": text,
                "child": [],
            })
    
    output_image_path = os.path.join(output_dir, f'{os.path.splitext(image_name)[0]}_Paddle.jpg')
    cv2.imwrite(output_image_path, img)
    
    output_json_path = os.path.join(output_dir, f'{os.path.splitext(image_name)[0]}_Paddle.json')
    with open(output_json_path, 'w') as json_file:
        json.dump(output, json_file, indent=4)
    
    return redirect(url_for('label_editor', image_name=os.path.splitext(image_name)[0]))

@app.route('/label_editor/<image_name>')
def label_editor(image_name):
    image_url = url_for('static', filename=f'output/{image_name}.jpg')
    json_url = url_for('static', filename=f'output/{image_name}_Paddle.json')
    return render_template('label_editor.html', image_name=image_name, image_url=image_url, json_url=json_url)

@app.route('/label_update', methods=['POST'])
def label_update():
    data = request.get_json()
    image_name = data.get('image_name')
    labels = data.get('labels')
    
    json_path = os.path.join(output_dir, f"{image_name}_Paddle.json")
    with open(json_path, 'w') as json_file:
        json.dump(labels, json_file, indent=4)
    
    return jsonify({'success': True}), 200

@app.route('/run_yolo/<image_name>', methods=['POST'])
def run_yolo(image_name):
    img_path = os.path.join(output_dir, f"{image_name}.jpg")
    results = YoloModel.predict(source=img_path, save=True, conf=0.25, device=0)
    img = cv2.imread(img_path)
    json_data = []

    for result in results:
        for box in result.boxes:
            bbox = box.xyxy[0].cpu().numpy().astype(int).tolist()
            class_id = int(box.cls.cpu().numpy())
            confidence = float(box.conf.cpu().numpy())
            entry_uuid = str(uuid.uuid4())

            cv2.rectangle(img, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 2)
            json_data.append({
                "uuid": entry_uuid,
                "class": labels[class_id],
                "confidence": confidence,
                "bbox": bbox,
                "text": "",
                "parent": ""
            })

    json_output_path = os.path.join(output_dir, f"{image_name}_yolo.json")
    with open(json_output_path, 'w') as json_file:
        json.dump(json_data, json_file, indent=4)

    output_image_path = os.path.join(output_dir, f"{image_name}_yolo.jpg")
    cv2.imwrite(output_image_path, img)

    return jsonify({'success': True, 'message': 'YOLO prediction completed'}), 200

@app.route('/input_editor/<image_name>', methods=['GET'])
def input_editor(image_name):
    image_url = url_for('static', filename=f'output/{image_name}.jpg')
    json_url = url_for('static', filename=f'output/{image_name}_yolo.json')
    return render_template('input_editor.html', image_name=image_name, image_url=image_url, json_url=json_url)

@app.route('/input_update', methods=['POST'])
def input_update():
    data = request.get_json()
    image_name = data.get('image_name')
    labels = data.get('labels')
    
    json_path = os.path.join(output_dir, f"{image_name}_yolo.json")
    with open(json_path, 'w') as json_file:
        json.dump(labels, json_file, indent=4)
    
    return jsonify({'success': True}), 200


@app.route('/connection/<image_name>')
def connection(image_name):
    image_url = url_for('static', filename=f'output/{image_name}.jpg')
    yolo_json_path = os.path.join(output_dir, f'{image_name}_yolo.json')
    paddle_json_path = os.path.join(output_dir, f'{image_name}_Paddle.json')

    print(f"Image URL: {image_url}")
    print(f"YOLO JSON path: {yolo_json_path}")
    print(f"Paddle JSON path: {paddle_json_path}")

    
    try:
        with open(yolo_json_path, 'r') as yolo_file:
            yolo_data = json.load(yolo_file)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        # Handle error (e.g., log it and return an error message to the user)
        return f"Error loading YOLO data: {e}", 500

    try:
        with open(paddle_json_path, 'r') as paddle_file:
            paddle_data = json.load(paddle_file)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        return f"Error loading PaddleOCR data: {e}", 500

    # Add Mode field to YOLO data
    for item in yolo_data:
        item['Model'] = 'YOLO'
        item['child'] = []

    # Add Mode field to Paddle data
    for item in paddle_data:
        item['Model'] = 'PADDLE'
        item['parent'] = ''

    # Create the combined layout JSON by merging the two
    combined_layout = yolo_data + paddle_data
    os.makedirs(template_dir+'/'+image_name, exist_ok=True)
    layout_json_path = os.path.join(template_dir, f'{image_name}/layout.json')
    
    try:
        with open(layout_json_path, 'w') as layout_file:
            json.dump(combined_layout, layout_file, indent=4)
    except IOError as e:
        return f"Error writing layout JSON: {e}", 500
    layout_json_url = url_for('static', filename=f'Templates/{image_name}/layout.json')
    print(f"Layout JSON URL: {layout_json_url}")

    return render_template('connection.html', 
                           image_name=image_name, 
                           image_url=image_url, 
                           layout_json_url=layout_json_url)



@app.route('/save_changes', methods=['POST'])
def save_changes():
    layout = request.json
    image_name = layout.get('image_name')
    
    # Save the updated layout JSON
    layout_json_path = os.path.join(output_dir, f"{image_name}_layout.json")
    with open(layout_json_path, 'w') as layout_file:
        json.dump(layout, layout_file, indent=4)
    
    return jsonify({"message": "Changes saved successfully"}), 200

@app.route('/get_labels')
def get_labels():
    labels = ['Detailed', 'EmptyInput', 'TableColumn', 'boxInput', 'checkBox', 'lineInput', 'signature']
    return jsonify(labels)

if __name__ == '__main__':
    app.run(debug=True)

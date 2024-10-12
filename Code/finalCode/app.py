from flask import Flask, request, jsonify, send_file, render_template, redirect, url_for, send_from_directory
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


# Directory for storing templates (images and json files)
TEMPLATES_DIR = os.path.join('static', 'Templates')

# Ensure the templates directory exists
if not os.path.exists(TEMPLATES_DIR):
    os.makedirs(TEMPLATES_DIR)


# Route to list existing templates
@app.route('/')
def home():
    templatesDIR = [f for f in os.listdir(TEMPLATES_DIR)]
    print(templatesDIR)
    return render_template('index.html', templates=templatesDIR, loc=TEMPLATES_DIR)

# Route to display an existing template (image + JSON)
@app.route('/template/<template_id>')
def view_template(template_id):
    json_url = url_for('static', filename=f"Templates/{template_id}/layout.json")
    image_url = url_for('static', filename=f"Templates/{template_id}/image.jpg")
    return render_template('template.html', template_id=template_id,image_url=image_url,json_url=json_url)

@app.route('/paddleOCRrun', methods=['POST'])
def paddleOCRrun():
    image_file = request.files['image']
    image_name = image_file.filename
    img_path = os.path.join(output_dir, image_name)
    image_file.save(img_path)
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

    try:
        with open(yolo_json_path, 'r') as yolo_file:
            yolo_data = json.load(yolo_file)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        return f"Error loading YOLO data: {e}", 500

    try:
        with open(paddle_json_path, 'r') as paddle_file:
            paddle_data = json.load(paddle_file)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        return f"Error loading PaddleOCR data: {e}", 500

    # Add Model field to YOLO and Paddle data
    for item in yolo_data:
        item['Model'] = 'YOLO'
        item['child'] = []

    for item in paddle_data:
        item['Model'] = 'PADDLE'
        item['parent'] = ''

    # Merge YOLO and Paddle data
    combined_layout = yolo_data + paddle_data
    os.makedirs(TEMPLATES_DIR + '/' + image_name, exist_ok=True)

    # Fix the source path from image_url to the actual file path
    source_image_path = os.path.join(app.static_folder, f'output/{image_name}.jpg')
    destination_path = os.path.join(TEMPLATES_DIR, image_name, "image.jpg")
    shutil.copy(source_image_path, destination_path)

    # Save the layout JSON file
    layout_json_path = os.path.join(TEMPLATES_DIR, f'{image_name}/layout.json')
    
    try:
        with open(layout_json_path, 'w') as layout_file:
            json.dump(combined_layout, layout_file, indent=4)
    except IOError as e:
        return f"Error writing layout JSON: {e}", 50
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
    print(layout)
    # Save the updated layout JSON
    layout_json_path = os.path.join(TEMPLATES_DIR, f"{image_name}/layout.json")
    with open(layout_json_path, 'w') as layout_file:
        json.dump(layout["layout"], layout_file, indent=4)
    
    return jsonify({"message": "Changes saved successfully"}), 200

@app.route('/get_labels')
def get_labels():
    labels = ['Detailed', 'EmptyInput', 'TableColumn', 'boxInput', 'checkBox', 'lineInput', 'signature']
    return jsonify(labels)

if __name__ == '__main__':
    app.run(debug=True)

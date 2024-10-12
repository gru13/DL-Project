document.addEventListener('DOMContentLoaded', function() {
    // Check if Fabric.js is loaded
    if (typeof fabric === 'undefined') {
        console.error('Fabric.js is not loaded. Please check your script inclusion order.');
        return;
    }

    const canvas = new fabric.Canvas('canvas');
    let labels = [];

    document.getElementById('loadImage').addEventListener('click', function() {
        const fileInput = document.getElementById('imageUpload');
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                fabric.Image.fromURL(e.target.result, function(img) {
                    canvas.setDimensions({width: img.width, height: img.height});
                    canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
                    loadBoundingBoxes();
                });
            };
            reader.readAsDataURL(file);
        }
    });

    function loadBoundingBoxes() {
        fetch(json_url)
            .then(response => response.json())
            .then(data => {
                canvas.clear();
                labels = [];
                data.forEach(item => drawBoundingBox(item));
                updateLabels();
                runHandwrittenDataModel();
            })
            .catch(error => console.error('Error loading bounding boxes:', error));
    }

    function drawBoundingBox(item) {
        const [x, y, width, height] = item.bbox;
        const rect = new fabric.Rect({
            left: x,
            top: y,
            width: width - x,
            height: height - y,
            stroke: item.Model === 'YOLO' ? 'red' : 'blue',
            strokeWidth: 2,
            fill: 'rgba(0,0,0,0.1)',
            selectable: false
        });
        canvas.add(rect);
        
        const text = new fabric.Text(item.uuid, {
            left: x,
            top: y - 20,
            fontSize: 12,
            fill: item.Model === 'YOLO' ? 'red' : 'blue'
        });
        canvas.add(text);
        
        labels.push({
            uuid: item.uuid,
            text: item.text || '',
            bbox: item.bbox,
            model: item.Model
        });
    }

    function updateLabels() {
        const labelsContainer = document.getElementById('labels');
        labelsContainer.innerHTML = '';
        labels.forEach(label => {
            const labelDiv = document.createElement('div');
            labelDiv.innerHTML = `
                <span>UUID: ${label.uuid}</span>
                <span>Model: ${label.model}</span>
                <input type="text" value="${label.text}" data-uuid="${label.uuid}">
            `;
            labelsContainer.appendChild(labelDiv);
        });
    }

    document.getElementById('saveChanges').addEventListener('click', function() {
        const updatedLabels = Array.from(document.querySelectorAll('#labels input')).map(input => ({
            uuid: input.dataset.uuid,
            text: input.value
        }));
        console.log('Updated labels:', updatedLabels);
        // Placeholder for sending data to server
    });

    function runHandwrittenDataModel() {
        const yoloBoundingBoxes = labels.filter(label => label.model === 'YOLO');
        console.log('Running handwritten data model on YOLO bounding boxes:', yoloBoundingBoxes);
        // Placeholder for handwritten data extraction logic
        yoloBoundingBoxes.forEach(box => {
            const extractedText = `Extracted text for ${box.uuid}`;
            const labelInput = document.querySelector(`input[data-uuid="${box.uuid}"]`);
            if (labelInput) {
                labelInput.value = extractedText;
            }
        });
    }

    // Add event listener for label text changes
    document.getElementById('labels').addEventListener('input', function(e) {
        if (e.target.tagName === 'INPUT') {
            const uuid = e.target.dataset.uuid;
            const newText = e.target.value;
            const label = labels.find(l => l.uuid === uuid);
            if (label) {
                label.text = newText;
            }
            const canvasText = canvas.getObjects('text').find(obj => obj.text === uuid);
            if (canvasText) {
                canvasText.set('text', `${uuid}: ${newText}`);
                canvas.renderAll();
            }
        }
    });
});

document.getElementById('loadImage').addEventListener('click', function() {
    const fileInput = document.getElementById('imageUpload');
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            fabric.Image.fromURL(e.target.result, function(img) {
                canvas.setDimensions({width: img.width, height: img.height});
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
                loadBoundingBoxes();
            });
        };
        reader.readAsDataURL(file);
    }
});

function loadBoundingBoxes() {
    fetch(json_url)
        .then(response => response.json())
        .then(data => {
            canvas.clear();
            labels = [];
            data.forEach(item => drawBoundingBox(item));
            updateLabels();
            runHandwrittenDataModel();
        })
        .catch(error => console.error('Error loading bounding boxes:', error));
}

function drawBoundingBox(item) {
    const [x, y, width, height] = item.bbox;
    const rect = new fabric.Rect({
        left: x,
        top: y,
        width: width - x,
        height: height - y,
        stroke: item.Model === 'YOLO' ? 'red' : 'blue',
        strokeWidth: 2,
        fill: 'rgba(0,0,0,0.1)',
        selectable: false
    });
    canvas.add(rect);
    
    const text = new fabric.Text(item.uuid, {
        left: x,
        top: y - 20,
        fontSize: 12,
        fill: item.Model === 'YOLO' ? 'red' : 'blue'
    });
    canvas.add(text);
    
    labels.push({
        uuid: item.uuid,
        text: item.text || '',
        bbox: item.bbox,
        model: item.Model
    });
}

function updateLabels() {
    const labelsContainer = document.getElementById('labels');
    labelsContainer.innerHTML = '';
    labels.forEach(label => {
        const labelDiv = document.createElement('div');
        labelDiv.innerHTML = `
            <span>UUID: ${label.uuid}</span>
            <span>Model: ${label.model}</span>
            <input type="text" value="${label.text}" data-uuid="${label.uuid}">
        `;
        labelsContainer.appendChild(labelDiv);
    });
}

document.getElementById('saveChanges').addEventListener('click', function() {
    const updatedLabels = Array.from(document.querySelectorAll('#labels input')).map(input => ({
        uuid: input.dataset.uuid,
        text: input.value
    }));
    // Here you would typically send the updatedLabels to your server
    console.log('Updated labels:', updatedLabels);
    // Placeholder for sending data to server
    // fetch('/update_labels', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(updatedLabels),
    // })
    // .then(response => response.json())
    // .then(data => console.log('Success:', data))
    // .catch((error) => console.error('Error:', error));
});

function runHandwrittenDataModel() {
    const yoloBoundingBoxes = labels.filter(label => label.model === 'YOLO');
    console.log('Running handwritten data model on YOLO bounding boxes:', yoloBoundingBoxes);
    // Placeholder for handwritten data extraction logic
    yoloBoundingBoxes.forEach(box => {
        // Simulate extracting text from the bounding box
        const extractedText = `Extracted text for ${box.uuid}`;
        // Update the label with the extracted text
        const labelInput = document.querySelector(`input[data-uuid="${box.uuid}"]`);
        if (labelInput) {
            labelInput.value = extractedText;
        }
    });
}

// Add event listener for label text changes
document.getElementById('labels').addEventListener('input', function(e) {
    if (e.target.tagName === 'INPUT') {
        const uuid = e.target.dataset.uuid;
        const newText = e.target.value;
        // Update the label object
        const label = labels.find(l => l.uuid === uuid);
        if (label) {
            label.text = newText;
        }
        // Update the text on the canvas
        const canvasText = canvas.getObjects('text').find(obj => obj.text === uuid);
        if (canvasText) {
            canvasText.set('text', `${uuid}: ${newText}`);
            canvas.renderAll();
        }
    }
});
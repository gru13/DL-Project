let layout = [];
let canvas;

// Function to initialize Fabric canvas
function initCanvas() {
    canvas = new fabric.Canvas('canvas', {
        selection: false,
        hoverCursor: 'pointer'
    });
}

// Function to load image into the canvas from user input
function loadImageFromFile(file) {
    const reader = new FileReader();

    reader.onload = function(event) {
        fabric.Image.fromURL(event.target.result, function(img) {
            // Set canvas size to match the image dimensions
            canvas.setWidth(img.width);
            canvas.setHeight(img.height);
            
            // Set the image as canvas background
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                scaleX: 1,
                scaleY: 1
            });

            // After the image is loaded, render the bounding boxes
            renderDetections();

            document.getElementById('inputForm').style.display = 'none';
            document.getElementById('extractData').style.display = 'block';
        });
    };

    reader.readAsDataURL(file);
}

// Load JSON data when the page loads
function loadLayoutData() {
    document.getElementById('extractData').style.display = 'none';
    fetch(layoutJsonUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load layout JSON from ' + layoutJsonUrl);
            }
            return response.json();
        })
        .then(data => {
            layout = data;
            renderLabelDetails();
            addCanvasClickListener();
        })
        .catch(error => {
            console.error('Error loading JSON:', error);
            alert('Failed to load layout data. Please try again.');
        });
}

// Function to render detections (bounding boxes) on the canvas
function renderDetections() {
    // Clear all objects except background
    canvas.getObjects().slice().forEach(obj => {
        canvas.remove(obj);
    });

    // First, draw all the bounding boxes and labels
    layout.forEach(detection => {
        const bbox = detection.bbox;
        const model = detection.Model;

        // Set colors based on model
        const fillColor = model === 'YOLO' ? 'rgba(255,0,0,0.1)' :
                         model === 'PADDLE' ? 'rgba(0,0,255,0.1)' :
                         'rgba(0,255,0,0.1)';
        const strokeColor = model === 'YOLO' ? 'red' :
                          model === 'PADDLE' ? 'blue' :
                          'green';

        // Create rectangle for bounding box
        const rect = new fabric.Rect({
            left: bbox[0],
            top: bbox[1],
            width: bbox[2] - bbox[0],
            height: bbox[3] - bbox[1],
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: 2,
            selectable: false,
            uuid: detection.uuid
        });

        // Create text label
        const text = new fabric.Text(detection.class, {
            left: bbox[0],
            top: bbox[1] - 20,
            fontSize: 16,
            fill: 'black',
            selectable: false
        });

        canvas.add(rect, text);
    });

    // Draw connection lines with arrows
    layout.forEach(detection => {
        if (detection.parent) {
            const parentDetection = layout.find(item => item.uuid === detection.parent);
            if (parentDetection) {
                const childBbox = detection.bbox;
                const parentBbox = parentDetection.bbox;

                const childCenter = {
                    x: (childBbox[0] + childBbox[2]) / 2,
                    y: (childBbox[1] + childBbox[3]) / 2
                };
                const parentCenter = {
                    x: (parentBbox[0] + parentBbox[2]) / 2,
                    y: (parentBbox[1] + parentBbox[3]) / 2
                };

                drawArrowLine(childCenter, parentCenter);
            }
        }
    });

    canvas.renderAll();
}

// Function to draw an arrow line between two points
function drawArrowLine(from, to) {
    const headLength = 10;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    // Create the main line
    const line = new fabric.Line([from.x, from.y, to.x, to.y], {
        stroke: 'green',
        strokeWidth: 2,
        selectable: false
    });

    // Create arrowhead
    const arrowHead = new fabric.Triangle({
        left: to.x,
        top: to.y,
        pointType: 'arrow_start',
        angle: (angle * 180 / Math.PI) + 90,
        width: headLength,
        height: headLength * 2,
        fill: 'green',
        selectable: false
    });

    // Add both to canvas
    canvas.add(line, arrowHead);
}

// Function to add click listener to the canvas
function addCanvasClickListener() {
    canvas.on('mouse:down', function(options) {
        if (options.target && options.target.uuid) {
            focusOnLabel(options.target.uuid);
        }
    });
}

// Function to render label details in the sidebar
function renderLabelDetails() {
    const labelList = document.getElementById('labelList');
    labelList.innerHTML = '';

    layout.forEach(detection => {
        const li = document.createElement('div');
        li.className = 'label';
        li.id = `label-${detection.uuid}`;
        li.innerHTML = `
            <div><strong>UUID:</strong> ${detection.uuid}</div>
            <div><strong>Class:</strong> ${detection.class}</div>
            <div><strong>Text:</strong> ${detection.text}</div>
        `;
        if (detection.Model === 'YOLO') {
            li.innerHTML += `<div><strong>Parent:</strong> ${detection.parent}</div>`;
            li.classList.add("yolo");
        } else {
            li.innerHTML += `<div><strong>Child:</strong><br><hr><center>${detection.child.join("<br><hr>")}<br><hr></center></div>`;
            li.classList.add("paddle");
        }
        labelList.appendChild(li);
    });
}

// Function to focus on and scroll to a label
function focusOnLabel(uuid) {
    const labelElement = document.getElementById(`label-${uuid}`);
    if (labelElement) {
        labelElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        labelElement.classList.add('highlighted');
        setTimeout(() => {
            labelElement.classList.remove('highlighted');
        }, 2000);
    }
}

// Function to update the layout based on the backend response
function updateLayoutWithRecognizedText(updatedLayout) {
    updatedLayout.forEach(updatedItem => {
        for (let index = 0; index < layout.length; index++) {
            if (layout[index]['uuid'] === updatedItem['uuid']) {
                layout[index]['text'] = updatedItem.text;
            }
        }
    });
}

// Event Listeners
document.getElementById('image-upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        loadImageFromFile(file);
    }
});

document.getElementById('extractData').addEventListener('click', async function() {
    const emptyTextElements = layout.filter(detection => detection.text.trim() === '');
    console.log("kff")
    if (emptyTextElements.length === 0) {
        alert('No elements with empty text found.');
        return;
    }
    const imageInput = document.getElementById('image-upload');
    const imageFile = imageInput.files[0];
    await sendDataToFlask(emptyTextElements, imageFile);
});


// Initialize everything when the page loads
window.onload = function() {
    initCanvas();
    loadLayoutData();
};

// Function to send data to Flask backend
async function sendDataToFlask(data, imageFile) {
    const formData = new FormData();
    formData.append('layout', JSON.stringify(data));
    formData.append('image', imageFile);

    try {
        const response = await fetch('/process-empty-text-elements', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Error with request: ' + response.statusText);
        }

        const result = await response.json();
        console.log('Success:', result);
        alert('Data and image processed successfully.');

        updateLayoutWithRecognizedText(result.updated_layout);
        renderLabelDetails();
        renderDetections();
        updateJsonList();
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while sending data and image to the backend.');
    }
}




function mapTextToAllElements() {
    // Create a dictionary to store elements by UUID for quick access
    const elementDict = {};
    
    // Iterate through each element in the layout
    layout.forEach(element => {
        // Initialize the array for storing child texts if element has children
        elementDict[element.text] = [];

        // Check if the current element has any children
        if (element.child && element.child.length > 0) {
            // Iterate through the child UUIDs
            element.child.forEach(childUUID => {
                // Find the child element in the layout by UUID
                const child = layout.find(el => el.uuid === childUUID);
                if (child) {
                    // Add the child's text to the elementDict
                    elementDict[element.text].push(child.text);
                }
            });
        }
    });

    return elementDict;
}

function updateJsonList() {
    const jsonList = document.getElementById('jsonList');
    const mappedData = mapTextToAllElements();
    
    jsonList.innerHTML = '';
    
    for (const [key, value] of Object.entries(mappedData)) {
        const jsonItem = createJsonItem(key, value);
        jsonList.appendChild(jsonItem);
    }

    // Add a button to add new items
    const addButton = document.createElement('button');
    addButton.textContent = 'Add New Item';
    addButton.addEventListener('click', () => addNewJsonItem(jsonList));
    jsonList.appendChild(addButton);
}

function createJsonItem(key, value) {
    const jsonItem = document.createElement('div');
    jsonItem.className = 'json-item';
    jsonItem.innerHTML = `
        <input type="text" class="json-key" value="${key}">
        <textarea class="json-value">${value.join('\n')}</textarea>
        <button class="remove-item">Remove</button>
    `;

    jsonItem.querySelector('.remove-item').addEventListener('click', () => {
        jsonItem.remove();
    });

    return jsonItem;
}

function addNewJsonItem(container) {
    const newItem = createJsonItem('New Key', ['New Value']);
    container.insertBefore(newItem, container.lastElementChild);
}

function saveJsonFile() {
    const jsonData = {};
    const jsonItems = document.querySelectorAll('.json-item');
    
    jsonItems.forEach(item => {
        const key = item.querySelector('.json-key').value.trim();
        const value = item.querySelector('.json-value').value.split('\n').map(v => v.trim()).filter(v => v !== '');
        if (key !== '') {
            jsonData[key] = value;
        }
    });
    
    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mapped_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

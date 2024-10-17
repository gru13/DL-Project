let canvas;
let labels = [];
let backgroundImage;
let isDrawing = false;
let startX, startY;
const addBoxBtn = document.getElementById('addBox');
let labelList = document.getElementById('labelList');

window.onload = function() {
    initializeCanvas();
    addEventListeners();
}

function initializeCanvas() {
    canvas = new fabric.Canvas('canvas');
    canvas.setWidth(800);
    canvas.setHeight(600);

    fabric.Image.fromURL(image_url, function(img) {
        backgroundImage = img;
        canvas.setWidth(img.width);
        canvas.setHeight(img.height);
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        loadLabels();
    });
}

function addEventListeners() {
    canvas.on('object:modified', onObjectModified);
    canvas.on('selection:created', onObjectSelected);
    canvas.on('selection:updated', onObjectSelected);
    canvas.on('selection:cleared', onSelectionCleared);
    canvas.on('object:scaling', onObjectScaling);
    canvas.on('object:moving', onObjectMoving);
    addBoxBtn.addEventListener('click', toggleDrawMode);
}

function onObjectScaling(event) {
    let target = event.target;
    target.setCoords();
}

function onObjectMoving(event) {
    let target = event.target;
    target.setCoords();
}

function onObjectModified(event) {
    let modifiedObject = event.target;
    if (modifiedObject && typeof modifiedObject.labelIndex !== 'undefined') {
        let updatedLabel = labels[modifiedObject.labelIndex];
        if (updatedLabel) {
            updateLabelFromRect(updatedLabel, modifiedObject);
            updateLabelList();
            console.log(`Updated label ${modifiedObject.labelIndex}:`, updatedLabel);
        }
    }
}


function loadLabels() {
    fetch(json_url)
        .then(response => response.json())
        .then(data => {
            labels = data;
            drawBoxes();
            updateLabelList();
        });
}

function createRectFromLabel(label, index) {
    let rect = new fabric.Rect({
        left: label.bbox[0],
        top: label.bbox[1],
        width: label.bbox[2] - label.bbox[0],
        height: label.bbox[3] - label.bbox[1],
        fill: 'rgba(0,255,0,0.3)',
        stroke: 'green',
        strokeWidth: 2,
        selectable: true,
        hoverCursor: 'move'
    });

    rect.labelIndex = index;
    return rect;
}

function drawBoxes() {
    canvas.clear();
    canvas.setBackgroundImage(backgroundImage, canvas.renderAll.bind(canvas));

    labels.forEach((label, index) => {
        let rect = createRectFromLabel(label, index);
        canvas.add(rect);
    });

    canvas.renderAll();
}

function updateLabelList() {
    labelList.innerHTML = '';

    labels.forEach((label, index) => {
        let labelDiv = createLabelDiv(label, index);
        labelList.appendChild(labelDiv);
    });
}

function createLabelDiv(label, index) {
    let labelDiv = document.createElement('div');
    labelDiv.className = 'label';
    labelDiv.id = `label-${index}`;
    
    const classOptions = ['Label'];
    
    let optionsHtml = classOptions.map(option => 
        `<option value="${option}" ${label.class === option ? 'selected' : ''}>${option}</option>`
    ).join('');
    
    labelDiv.innerHTML = `
            <p>UUID: ${label.uuid}</p>
            <p>Text: ${label.text}</p>
            <p>Confidence: ${label.confidence.toFixed(2)}</p>
            <p>Class: ${label.class}</p>
            <p>BBox: [${label.bbox.join(", ")}]</p>
            <input type="text" value="${label.text}" onchange="updateLabelText(${index}, this.value)">
            <select onchange="updateLabelClass(${index}, this.value)">
                ${optionsHtml}
            </select>
            <button onclick="deleteLabel(${index})">Delete</button>
        `;
    return labelDiv;
}


// Drawing mode functions
function toggleDrawMode() {
    if (!isDrawing) {
        startDrawMode();
    } else {
        endDrawMode();
    }
}

function startDrawMode() {
    isDrawing = true;
    addBoxBtn.textContent = 'Cancel Drawing';
    canvas.selection = false;
    canvas.forEachObject(obj => obj.selectable = false);
    addDrawingEventListeners();
}

function endDrawMode() {
    isDrawing = false;
    addBoxBtn.textContent = 'Add Box';
    canvas.selection = true;
    canvas.forEachObject(obj => obj.selectable = true);
    removeDrawingEventListeners();
}

function addDrawingEventListeners() {
    canvas.on('mouse:down', startDrawing);
    canvas.on('mouse:move', drawRect);
    canvas.on('mouse:up', endDrawing);
}

function removeDrawingEventListeners() {
    canvas.off('mouse:down', startDrawing);
    canvas.off('mouse:move', drawRect);
    canvas.off('mouse:up', endDrawing);
}

let rect;
function startDrawing(o) {
    let pointer = canvas.getPointer(o.e);
    startX = pointer.x;
    startY = pointer.y;
    rect = new fabric.Rect({
        left: startX,
        top: startY,
        width: 0,
        height: 0,
        fill: 'rgba(0,255,0,0.3)',
        stroke: 'green',
        strokeWidth: 2
    });
    canvas.add(rect);
}

function drawRect(o) {
    if (!isDrawing) return;
    let pointer = canvas.getPointer(o.e);
    if (startX > pointer.x) {
        rect.set({ left: pointer.x });
    }
    if (startY > pointer.y) {
        rect.set({ top: pointer.y });
    }
    rect.set({
        width: Math.abs(startX - pointer.x),
        height: Math.abs(startY - pointer.y)
    });
    canvas.renderAll();
}

function endDrawing() {
    if (!isDrawing) return;

    canvas.remove(rect);

    let newRect = createNewRect();
    let newLabel = createNewLabel(newRect);
    
    labels.push(newLabel);
    newRect.labelIndex = labels.length - 1;

    canvas.add(newRect);
    canvas.setActiveObject(newRect);

    updateLabelList();
    endDrawMode();
}


function createNewRect() {
    return new fabric.Rect({
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        fill: 'rgba(0,255,0,0.3)',
        stroke: 'green',
        strokeWidth: 2,
        selectable: true
    });
}

function createNewLabel(rect) {
    return {
        uuid: uuidv4(),
        text: "",
        class: 'Label',
        confidence: 1.0,
        bbox: [
            Math.round(rect.left),
            Math.round(rect.top),
            Math.round(rect.left + rect.width),
            Math.round(rect.top + rect.height)
        ],
        child:[]
    };
}

function updateLabelFromRect(label, rect) {
    if (label && rect) {
        label.bbox = [
            Math.round(rect.left),
            Math.round(rect.top),
            Math.round(rect.left + rect.getScaledWidth()),
            Math.round(rect.top + rect.getScaledHeight())
        ];
    }
}

function updateLabelClass(index, newClass) {
    labels[index].class = newClass;
    updateLabelList();
}


function updateLabelFromRect(label, rect) {
    label.bbox = [
        Math.round(rect.left),
        Math.round(rect.top),
        Math.round(rect.left + rect.width),
        Math.round(rect.top + rect.height)
    ];
}

function updateLabelText(index, newText) {
    labels[index].text = newText;
    updateLabelInList(index);
}

function updateLabelClass(index, newClass) {
    labels[index].class = newClass;
    updateLabelInList(index);
}


function onObjectSelected(event) {
    let selectedObject = event.selected[0];
    if (selectedObject && selectedObject.labelIndex !== undefined) {
        highlightLabel(selectedObject.labelIndex);
    }
}

function onSelectionCleared() {
    clearLabelHighlight();
}

function highlightLabel(index) {
    clearLabelHighlight();
    let labelDiv = document.getElementById(`label-${index}`);
    if (labelDiv) {
        labelDiv.classList.add('highlighted');
        labelDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function clearLabelHighlight() {
    document.querySelectorAll('.label.highlighted')
        .forEach(label => label.classList.remove('highlighted'));
}

function deleteLabel(index) {
    labels.splice(index, 1);
    drawBoxes();
    updateLabelList();
}



function updateLabelInList(index) {
    let labelDiv = document.getElementById(`label-${index}`);
    if (labelDiv) {
        labelDiv.innerHTML = `
            <p>Text: ${labels[index].text}</p>
            <p>Confidence: ${labels[index].confidence.toFixed(2)}</p>
            <p>Class: ${labels[index].class}</p>
            <p>BBox: [${labels.bbox.join(", ")}]</p>
            <input type="text" value="${labels[index].text}" onchange="updateLabelText(${index}, this.value)">
            <select onchange="updateLabelClass(${index}, this.value)">
                <option value="Label" ${labels[index].class === 'Label' ? 'selected' : ''}>Label</option>
            </select>
            <button onclick="deleteLabel(${index})">Delete</button>
        `;
    }
}


function onSelectionCleared() {
    clearLabelHighlight();
}

function highlightLabel(index) {
    clearLabelHighlight();
    let labelDiv = document.getElementById(`label-${index}`);
    if (labelDiv) {
        labelDiv.classList.add('highlighted');
        labelDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function clearLabelHighlight() {
    let highlightedLabels = document.querySelectorAll('.label.highlighted');
    highlightedLabels.forEach(label => label.classList.remove('highlighted'));
}

function deleteLabel(index) {
    labels.splice(index, 1);
    drawBoxes();
    updateLabelList();
}

function saveChanges() {
    console.log(labels);
    fetch('/label_update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image_name: image_name,
            labels: labels
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Changes saved successfully!');
        } else {
            alert('Error saving changes.');
        }
    });
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function goToInputEditor() {
    window.location.href = '/input_editor/' + image_name;
}

function runPaddle() {
    // Get the canvas element
    const canvas = document.getElementById('canvas');

    // Convert the canvas content to a blob
    canvas.toBlob(function(blob) {
        if (!blob) {
            console.error("Canvas is empty or conversion failed.");
            return;
        }

        // Create a new FormData object to hold the file
        const formData = new FormData();

        // Create a new file object from the blob and name it
        const file = new File([blob], "canvas_image.jpg", { type: "image/jpeg" });

        // Append the file to the FormData object
        formData.append("image", file);

        // Submit the form to the Flask endpoint using fetch API
        fetch('/paddleOCRrun/'+image_name, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            // Check if the response is OK (status code 200-299)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json(); // Parse response data if applicable
        })
        .then(data => {
            // Assuming the response contains a redirect URL
            if (data.redirect_url) {
                // Redirect to the label editor page for this image
                window.location.href = data.redirect_url;
            } else {
                // If no redirect URL, reload the page after processing
                window.location.reload();
            }
        })
        .catch(error => {
            // Log any errors encountered during the fetch request
            console.error('Error running PaddleOCR:', error);
            alert('An error occurred while processing the image. Please try again.'); // User-friendly error message
        });
    }, 'image/jpeg');
}
let layout = [];

// Function to load image into the canvas from user input
function loadImageFromFile(file) {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const reader = new FileReader();
    const image = new Image();

    reader.onload = function (event) {
        image.onload = function () {
            // Set canvas size to match the image dimensions
            canvas.width = image.width;
            canvas.height = image.height;

            // Draw the image onto the canvas
            ctx.drawImage(image, 0, 0);

            // After the image is drawn, render the bounding boxes
            renderDetections();

            // Hide the file input after the image is loaded
            document.getElementById('imageInput').style.display = 'none';
        };
        image.src = event.target.result; // Set the image source to the file data
    };

    reader.readAsDataURL(file);  // Read the file as a data URL
}

// Load JSON data when the page loads
function loadLayoutData() {
    // Fetch the JSON data using the passed URL
    fetch(layoutJsonUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load layout JSON from ' + layoutJsonUrl);
            }
            return response.json();  // Parse the JSON response
        })
        .then(data => {
            layout = data; // Assign the data to the 'layout' variable or use it as needed
            renderLabelDetails(); // Render label details after data is loaded
        })
        .catch(error => {
            console.error('Error loading JSON:', error);
            alert('Failed to load layout data. Please try again.');
        });
}

// Function to render detections (bounding boxes) on the canvas
function renderDetections() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Loop through each detection in the layout data
    layout.forEach(detection => {
        const bbox = detection.bbox;
        const model = detection.Model;

        // Set the style for the bounding box fill based on the Model
        if (model === 'YOLO') {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';  // Red with 90% opacity
            ctx.strokeStyle = 'red';  // Red border for bbox
        } else if (model === 'PADDLE') {
            ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';  // Blue with 90% opacity
            ctx.strokeStyle = 'blue';  // Blue border for bbox
        } else {
            ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';  // Green as a fallback (if no model matches)
            ctx.strokeStyle = 'green';
        }

        ctx.lineWidth = 2;

        // Fill the bounding box with the semi-transparent color
        ctx.fillRect(bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);

        // Draw the bounding box (bbox: [x, y, width, height])
        ctx.strokeRect(bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);

        // Optionally, add the label/class name above the bbox
        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';
        ctx.fillText(detection.class, bbox[0], bbox[1] - 10); // Display class above the bounding box
    });
}

// Function to render label details in the sidebar
function renderLabelDetails() {
    const labelList = document.getElementById('labelDetails');
    labelList.innerHTML = ''; // Clear previous details

    // Loop through each detection and add details to the list
    layout.forEach(detection => {
        const li = document.createElement('li');
        li.className = 'label'
        li.innerHTML = `
            <strong>UUID:</strong> ${detection.uuid}<br>
            <strong>Class:</strong> ${detection.class}<br>
            <strong>Confidence:</strong> ${detection.confidence}<br>
            <strong>BBox:</strong> [${detection.bbox.join(', ')}]<br>
            <strong>Text:</strong> ${detection.text}<br>
            <strong>Model:</strong> ${detection.Model}<br>
            <strong>Parent:</strong> ${detection.parent}<br>
            <hr>
        `;
        labelList.appendChild(li);
    });
}

// Add event listener for the file input
document.getElementById('imageInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        loadImageFromFile(file);
    }
});

// Start loading layout data after the page loads
window.onload = loadLayoutData;

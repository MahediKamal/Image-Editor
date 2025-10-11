// Elements
const fileInput = document.getElementById("fileInput");
const gallery = document.getElementById("gallery");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const cropBtn = document.getElementById("cropBtn");
const applyCropBtn = document.getElementById("applyCropBtn");
const collageBtn = document.getElementById("collageBtn");
const downloadBtn = document.getElementById("downloadBtn");
const brightnessSlider = document.getElementById("brightness");
const contrastSlider = document.getElementById("contrast");

// State
let images = [];
let selectedImage = null;
let mode = null; // 'crop' or 'collage' or null
let displayScale = 1;
let isDragging = false;
let startX = 0, startY = 0, currentX = 0, currentY = 0;
let cropRect = null;

// Collage tiles for drag & reorder
let tiles = [];
let dragTile = null;
let offsetX = 0, offsetY = 0;

// --- Load Images ---
fileInput.addEventListener("change", e => {
    const files = Array.from(e.target.files);
    gallery.innerHTML = "";
    images = [];
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                images.push(img);
                const preview = document.createElement("img");
                preview.src = img.src;
                preview.addEventListener("click", () => selectImage(img));
                gallery.appendChild(preview);
            };
        };
        reader.readAsDataURL(file);
    });
});

// --- Select image ---
function selectImage(img) {
    selectedImage = img;
    document.querySelectorAll(".gallery img").forEach(p => p.classList.remove("selected"));
    const preview = [...document.querySelectorAll(".gallery img")].find(p => p.src === img.src);
    if(preview) preview.classList.add("selected");
    drawImage();
}

// --- Draw single image ---
function drawImage() {
    if(!selectedImage) return;
    const brightness = brightnessSlider.value;
    const contrast = contrastSlider.value;
    const fullWidth = selectedImage.naturalWidth;
    const fullHeight = selectedImage.naturalHeight;
    const maxW = window.innerWidth*0.6;
    const maxH = window.innerHeight*0.7;
    displayScale = Math.min(maxW/fullWidth, maxH/fullHeight,1);
    canvas.width = fullWidth*displayScale;
    canvas.height = fullHeight*displayScale;
    canvas.style.display="block";
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(selectedImage,0,0,canvas.width,canvas.height);
    // Draw crop rectangle
    if(cropRect){
        ctx.strokeStyle="#ff0000";
        ctx.setLineDash([6]);
        ctx.lineWidth=2;
        ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
    }
}

// --- Toggle Modes ---
cropBtn.addEventListener("click",()=>{
    mode = (mode==="crop")? null : "crop";
    updateModeStyles();
    if(mode==="crop") drawImage();
});

collageBtn.addEventListener("click",()=>{
    mode = (mode==="collage")? null : "collage";
    updateModeStyles();
    if(mode==="collage") initCollage();
});

function updateModeStyles(){
    cropBtn.style.background = mode==="crop"?"#007bff":"";
    cropBtn.style.color = mode==="crop"?"white":"";
    collageBtn.style.background = mode==="collage"?"#007bff":"";
    collageBtn.style.color = mode==="collage"?"white":"";
}

// --- Crop Mouse Events ---
canvas.addEventListener("mousedown", e=>{
    if(mode!=="crop" || !selectedImage) return;
    isDragging=true;
    const rect=canvas.getBoundingClientRect();
    startX=e.clientX-rect.left;
    startY=e.clientY-rect.top;
});

canvas.addEventListener("mousemove", e=>{
    if(!isDragging || mode!=="crop") return;
    const rect=canvas.getBoundingClientRect();
    currentX=e.clientX-rect.left;
    currentY=e.clientY-rect.top;
    cropRect={x:Math.min(startX,currentX), y:Math.min(startY,currentY), w:Math.abs(currentX-startX), h:Math.abs(currentY-startY)};
    drawImage();
});

canvas.addEventListener("mouseup", e=>{
    if(mode!=="crop") return;
    isDragging=false;
});

// --- Apply Crop ---
applyCropBtn.addEventListener("click", ()=>{
    if(!cropRect || !selectedImage) return;
    const scaleBack = 1 / displayScale;
    const cropX = cropRect.x*scaleBack;
    const cropY = cropRect.y*scaleBack;
    const cropW = cropRect.w*scaleBack;
    const cropH = cropRect.h*scaleBack;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width=cropW;
    tempCanvas.height=cropH;
    tempCanvas.getContext("2d").drawImage(selectedImage,cropX,cropY,cropW,cropH,0,0,cropW,cropH);
    selectedImage.src=tempCanvas.toDataURL();
    selectedImage.onload=drawImage;
    cropRect=null;
});

// --- Brightness/Contrast ---
brightnessSlider.addEventListener("input",()=>{
    if(mode==="crop") drawImage();
});
contrastSlider.addEventListener("input",()=>{
    if(mode==="crop") drawImage();
});

// --- Collage ---
function initCollage(){
    if(images.length<2) return alert("Load at least 2 images!");
    const cols = Math.ceil(Math.sqrt(images.length));
    const rows = Math.ceil(images.length/cols);
    const size = 300;
    canvas.width = cols*size;
    canvas.height = rows*size;
    tiles = images.map((img,i)=>{
        return {
            img,
            x: (i%cols)*size,
            y: Math.floor(i/cols)*size,
            w: size,
            h: size
        };
    });
    drawCollage();
}

// Draw collage
function drawCollage(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    tiles.forEach(tile=>{
        ctx.drawImage(tile.img,0,0,tile.img.naturalWidth,tile.img.naturalHeight,tile.x,tile.y,tile.w,tile.h);
        ctx.strokeStyle="#007bff";
        ctx.lineWidth=2;
        ctx.strokeRect(tile.x,tile.y,tile.w,tile.h);
    });
}

// --- Drag/Drop Collage Tiles ---
canvas.addEventListener("mousedown", e=>{
    if(mode!=="collage") return;
    const rect=canvas.getBoundingClientRect();
    const mx = e.clientX-rect.left;
    const my = e.clientY-rect.top;
    dragTile = tiles.find(t=>mx>t.x && mx<t.x+t.w && my>t.y && my<t.y+t.h);
    if(dragTile){
        offsetX = mx - dragTile.x;
        offsetY = my - dragTile.y;
    }
});
canvas.addEventListener("mousemove", e=>{
    if(mode!=="collage" || !dragTile) return;
    const rect=canvas.getBoundingClientRect();
    dragTile.x = e.clientX-rect.left - offsetX;
    dragTile.y = e.clientY-rect.top - offsetY;
    drawCollage();
});
canvas.addEventListener("mouseup", e=>{
    dragTile=null;
});

// --- Download ---
downloadBtn.addEventListener("click", ()=>{
    const link = document.createElement("a");
    link.download = mode==="collage"?"collage.png":"edited_image.png";
    link.href = canvas.toDataURL("image/png",1.0);
    link.click();
});

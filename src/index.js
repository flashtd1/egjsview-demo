import {PanoViewer} from '@egjs/view360'

let isEdit = false

window.toggleEdit = function(e) {
    isEdit = !isEdit
    e.target.innerText = isEdit ? '关闭': '编辑'
    e.stopPropagation()
}

let currentPage = "1"
let hotspots = Array.prototype.slice.call(document.querySelectorAll(".hotspot"))
const container = document.querySelector('#myviewer')
const panoViewer = new PanoViewer(
    container,
    {
        image: './images/bookcube1.jpg',
        projectionType: PanoViewer.PROJECTION_TYPE.CUBEMAP,
        useZoom: false,
        cubemapConfig: {
            tileConfig: { flipHorizontal: true, rotation: 0 }
        }
    }
).on('viewChange', (e) => {
    // console.log(e)
    console.log('yaw',panoViewer.getYaw())
    console.log('pitch',panoViewer.getPitch())

    setHotspotOffsets(panoViewer)
})

function toRadian(deg) {
    return deg * Math.PI / 180;
}
function getHFov(fov) {
    var rect = container.getBoundingClientRect();
    var width = rect.width;
    var height = rect.height;
    return Math.atan(width / height * Math.tan(toRadian(fov) / 2)) / Math.PI * 360;
}
function rotate(point, deg) {
    var rad = toRadian(deg);
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);

    return [cos * point[0] - sin * point[1], sin * point[0] + cos * point[1]];
}
function setHotspotOffset(hotspot, viewer) {
    var oyaw = viewer.getYaw();
    var opitch = viewer.getPitch();
    var yaw = parseFloat(hotspot.getAttribute("data-yaw"));
    var pitch = parseFloat(hotspot.getAttribute("data-pitch"));
    var deltaYaw = yaw - oyaw;
    var deltaPitch = pitch - opitch;
    // console.log(`${hotspot.innerText}:deltaYaw`, deltaYaw)
    // console.log(`${hotspot.innerText}:deltaPitch`, deltaPitch)
    if (deltaYaw < -180) {
        deltaYaw += 360;
    } else if (deltaYaw > 180) {
        deltaYaw -= 360;
    }
    if (Math.abs(deltaYaw) > 90) {
        hotspot.style.transform = "translate(-200px, 0px)";
        return;
    }
    var radYaw = toRadian(deltaYaw);
    var radPitch = toRadian(deltaPitch);

    var fov = viewer.getFov();
    var hfov = getHFov(fov);

    var rx = Math.tan(toRadian(hfov) / 2);
    var ry = Math.tan(toRadian(fov) / 2);


    var point = [
        Math.tan(-radYaw) / rx,
        Math.tan(-radPitch) / ry,
    ];

    // Image rotation compensation
    // The original image is about 10 degrees tilted.
    point = point.map(function (p) {
        return p * Math.cos(15 / 180 * Math.PI);
    });
    point[1] = rotate(point, deltaYaw > 0 ? -10 : 10)[1];

    // point[0] /= 1.05;
    var left = viewer._width / 2 + point[0] * viewer._width / 2;
    var top = viewer._height / 2 + point[1] * viewer._height / 2;

    hotspot.style.transform = "translate(" + left + "px, " + top + "px) translate(-50%, -50%)";
}
function setHotspotOffsets(viewer) {
    hotspots.filter(function (hotspot) {
        return hotspot.getAttribute("data-page") === currentPage;
    }).forEach(function (hotspot) {
        setHotspotOffset(hotspot, viewer);
    });
}

function calculateDelta({clientX, clientY}) {
    let oYaw = panoViewer.getYaw()
    let oPitch = panoViewer.getPitch()

    let fov = panoViewer.getFov()
    let hFov = getHFov(fov)

    let centerX = panoViewer._width / 2
    let centerY = panoViewer._height / 2

    let deltaX = clientX - centerX
    let deltaY = clientY - centerY

    let distanceX = panoViewer._width / Math.tan(toRadian(hFov) / 2) / 2
    let distanceY = panoViewer._height / Math.tan(toRadian(fov) / 2) / 2
    let radDeltaHAngle = deltaX / distanceX
    // let radDeltaVAngle = deltaY / distanceY
    let deltaYaw = radDeltaHAngle * 180 / Math.PI

    let newDistance = Math.sqrt(Math.pow(distanceX, 2) + Math.pow(deltaX, 2))
    let radDeltaVAngle = Math.asin(deltaY / newDistance)
    let deltaPitch = radDeltaVAngle * 180 / Math.PI
    
    // panoViewer.lookAt({
    //     yaw: oYaw - deltaYaw,
    //     pitch: oPitch - deltaPitch
    // }, 500)

    let fYaw = oYaw - deltaYaw
    let fPitch = oPitch - deltaPitch
    return {
        fYaw,
        fPitch
    }
    
}

window.addEventListener('click', (e) => {
    console.log(panoViewer._width, panoViewer._height)
    if (isEdit) {
        let {fYaw, fPitch} = calculateDelta(e)
        panoViewer.lookAt({
            yaw: fYaw,
            pitch: fPitch
        })
        let newHotspot = document.createElement('div')
        newHotspot.setAttribute('class', 'hotspot link')
        newHotspot.setAttribute('data-page', currentPage)
        newHotspot.setAttribute('data-yaw', panoViewer.getYaw())
        newHotspot.setAttribute('data-pitch', panoViewer.getPitch())
        newHotspot.onclick = window.lookAt
        newHotspot.innerText = '新标签'
        document.querySelector('.viewer').appendChild(newHotspot)
        hotspots.push(newHotspot)
        setHotspotOffset(newHotspot, panoViewer)
    }
})


window.lookAt = function({target}) {
    let yaw = target.getAttribute('data-yaw')
    let pitch = target.getAttribute('data-pitch')
    // let yaw = target.attributes['data-yaw']
    // let pitch = target.attributes['data-pitch']
    console.log(yaw, pitch, panoViewer.getFov())
    let targetYaw = parseFloat(yaw)
    console.log(targetYaw)
    panoViewer.lookAt({
        yaw: targetYaw,
        pitch,
        fov: panoViewer.getFov()
    }, 500)
}

let interval = {}
let isAuto = {
    yaw: false,
    pitch: false
}
window.auto = function(type) {
    isAuto[type] = !isAuto[type]
    if (isAuto[type]) {
        interval[type] = setInterval(() => {
            panoViewer.lookAt({
                yaw: type == 'yaw' ? panoViewer.getYaw() + 1: panoViewer.getYaw(),
                pitch: type == 'pitch' ? panoViewer.getPitch() + 1 : panoViewer.getPitch()
            })
        }, 1000)
    } else {
        clearInterval(interval[type])
    }
}
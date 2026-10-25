'use strict';

let gl;                         
let surface;                    
let shProgram;                  
let spaceball;                  

let uSteps = 40;
let vSteps = 40;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

function multiplyPointByMatrix(matrix, point) {
    let x = point[0], y = point[1], z = point[2], w = 1.0;
    let rx = matrix[0]*x + matrix[4]*y +  matrix[8]*z + matrix[12]*w;
    let ry = matrix[1]*x + matrix[5]*y +  matrix[9]*z + matrix[13]*w;
    let rz = matrix[2]*x + matrix[6]*y + matrix[10]*z + matrix[14]*w;
    return [rx, ry, rz];
}

function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();
    this.count = 0;

    
    this.BufferData = function(verticesF32, normalsF32, indicesU16) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, verticesF32, gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normalsF32, gl.STREAM_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesU16, gl.STREAM_DRAW);

        this.count = indicesU16.length;
    }

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, true, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, true, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    }
}

function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    this.iColor = -1;
    this.iModelViewMatrix = -1;
    this.iProjectionMatrix = -1;
    this.iNormalMatrix = -1;
    this.iLightPos = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}

function draw() { 
    gl.clearColor(0, 0.1, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    let projection = m4.perspective(Math.PI/8, 1, 0.1, 100); 
    
    let modelView = spaceball.getViewMatrix();
    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -5);
    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let finalModelView = m4.multiply(translateToPointZero, matAccum0);

    let normalMatrix = m4.transpose(m4.inverse(finalModelView));

    let time = Date.now() * 0.001;
    let lightWorldPos = [Math.cos(time) * 5.0, 2.0, Math.sin(time) * 10.0];
    let lightEyePos = multiplyPointByMatrix(finalModelView, lightWorldPos);

    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, finalModelView);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);
    gl.uniform3fv(shProgram.iLightPos, lightEyePos);
    
    gl.uniform4fv(shProgram.iColor, [1.0, 1.0, 1.0, 1.0]);
    surface.Draw();
}

function CreateSurfaceData(data) {
    let vertices = [];
    let indices = [];
    let normals = [];
    
    const uMax = 14.5;
    const vMax = 1.5 * Math.PI; 
    const scale = 0.05; 
    
    function getVertex(u, v) {
        let x = u * Math.cos(Math.cos(u)) * Math.cos(v);
        let y = u * Math.cos(Math.cos(u)) * Math.sin(v);
        let z = u * Math.sin(Math.cos(u));
        return [x * scale, z * scale, y * scale];
    }

    for (let i = 0; i <= uSteps; i++) {
        let u = (i / uSteps) * uMax;
        for (let j = 0; j <= vSteps; j++) {
            let v = (j / vSteps) * vMax;
            vertices.push(...getVertex(u, v));
            normals.push(0, 0, 0); 
        }
    }

    for (let i = 0; i < uSteps; i++) {
        for (let j = 0; j < vSteps; j++) {
            let p1 = i * (vSteps + 1) + j;
            let p2 = p1 + 1;
            let p3 = (i + 1) * (vSteps + 1) + j;
            let p4 = p3 + 1;
            indices.push(p1, p2, p3);
            indices.push(p2, p4, p3);
        }
    }

    for (let i = 0; i < indices.length; i += 3) {
        let i1 = indices[i];
        let i2 = indices[i+1];
        let i3 = indices[i+2];

        let v1 = [vertices[i1*3], vertices[i1*3+1], vertices[i1*3+2]];
        let v2 = [vertices[i2*3], vertices[i2*3+1], vertices[i2*3+2]];
        let v3 = [vertices[i3*3], vertices[i3*3+1], vertices[i3*3+2]];

        let U = [v2[0]-v1[0], v2[1]-v1[1], v2[2]-v1[2]];
        let V = [v3[0]-v1[0], v3[1]-v1[1], v3[2]-v1[2]];

        let nx = U[1]*V[2] - U[2]*V[1];
        let ny = U[2]*V[0] - U[0]*V[2];
        let nz = U[0]*V[1] - U[1]*V[0];

        normals[i1*3] += nx; normals[i1*3+1] += ny; normals[i1*3+2] += nz;
        normals[i2*3] += nx; normals[i2*3+1] += ny; normals[i2*3+2] += nz;
        normals[i3*3] += nx; normals[i3*3+1] += ny; normals[i3*3+2] += nz;
    }

    for (let i = 0; i < normals.length; i += 3) {
        let nx = normals[i];
        let ny = normals[i+1];
        let nz = normals[i+2];
        let len = Math.sqrt(nx*nx + ny*ny + nz*nz);
        if (len > 0) {
            normals[i] /= len; normals[i+1] /= len; normals[i+2] /= len;
        }
    }

    data.verticesF32 = new Float32Array(vertices);
    data.normalsF32 = new Float32Array(normals);
    data.indicesU16 = new Uint16Array(indices);
}

function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex     = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal     = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewMatrix  = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
    shProgram.iNormalMatrix     = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iLightPos         = gl.getUniformLocation(prog, "lightPosition");
    shProgram.iColor            = gl.getUniformLocation(prog, "color");

    let data = {};
    CreateSurfaceData(data); // Функция наполнит data нужными массивами

    surface = new Model('Surface');
    // Передаем 3 массива в буфер (вершины, нормали, индексы)
    surface.BufferData(data.verticesF32, data.normalsF32, data.indicesU16);

    gl.enable(gl.DEPTH_TEST);
}

function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}

function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) { throw "Browser does not support WebGL"; }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML = "<p>Sorry.</p>";
        return;
    }
    try {
        initGL();  
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML = "<p>Sorry.</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    // Слайдеры для перестройки детализации
    document.getElementById("uSlider").addEventListener("input", function(e) {
        uSteps = parseInt(e.target.value);
        let data = {};
        CreateSurfaceData(data);
        surface.BufferData(data.verticesF32, data.normalsF32, data.indicesU16);
    });
    
    document.getElementById("vSlider").addEventListener("input", function(e) {
        vSteps = parseInt(e.target.value);
        let data = {};
        CreateSurfaceData(data);
        surface.BufferData(data.verticesF32, data.normalsF32, data.indicesU16);
    });

    // Анимация вращения света
    function renderLoop() {
        draw();
        window.requestAnimationFrame(renderLoop);
    }
    renderLoop();
}
import './App.css';
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import {GUI3DManager, HolographicButton, TextBlock, AdvancedDynamicTexture, InputText, StackPanel, Button} from "@babylonjs/gui"
import React, { useState, useEffect } from 'react';
import { Engine, Scene, Vector3, Vector4, Mesh, StandardMaterial, Texture, Color3, Color4, AbstractMesh, GlowLayer, PointLight, FreeCamera, CubeTexture, Sound, PostProcess, Effect, SceneLoader, Matrix, MeshBuilder, Quaternion, AssetsManager, HemisphericLight, UniversalCamera }  from "@babylonjs/core";

let _frame=0, _camera = null, _players=[], _meshedPlayers={}, _lockLoadingPlayer={}, _updating = false, _myid = null;
let _canvas, _gameScene = null, _loadingScene = null, _adt = null;
// 0=input name; 1=game
let _gamestates = 0;
let _gui3dmanager = null;
// const host = "http://localhost:8089/"
const host = ""
const createGameScene = (engine) => {
    // Create a basic BJS Scene object
    let scene = new Scene(engine);
    _gui3dmanager = new GUI3DManager(scene);

    // gravity
    const fps = 60
    const gravity = -9.81;
    scene.gravity = new Vector3(0, gravity/fps, 0);
    scene.collisionsEnabled = true;

    _camera = new UniversalCamera('camera1', new Vector3(0, 1, 5), scene);
    _camera.setTarget(Vector3.Zero());
    _camera.attachControl(_canvas, false);

    _camera.applyGravity = true;
    _camera.checkCollisions = true;
    _camera.ellipsoid = new Vector3(1,1,1);

    _camera.minZ = 0.45;
    _camera.speed = 0.5;
    _camera.angularSensibility = 3000;

    _camera.keysUp.push(87);
    _camera.keysLeft.push(65);
    _camera.keysDown.push(83);
    _camera.keysRight.push(68);

    // Create a basic light, aiming 0, 1, 0 - meaning, to the sky
    let light = new HemisphericLight('light1', new Vector3(0, 1, 0), scene);

    // Create a built-in "ground" shape;


    // Pointer lock
    scene.onPointerDown = (e) => {
        if (e.button == 0 && _gamestates == 1) {
            engine.enterPointerlock();
        }
        else {
            engine.exitPointerlock();
        }
    }
    // Return the created scene
    return scene;
}
async function updatePlayers() {
    let promises = [];
    for(let i in _players) {
        let player = _players[i];
        if (_lockLoadingPlayer[player.id] || player.id == _myid) {
            continue;
        }
        if (!_meshedPlayers[player.id]) {
            _lockLoadingPlayer[player.id] = true;
            promises.push(
                loadCharacter(player.id).then(playerMesh => {
                    playerMesh.mesh.position = player.pos;
                    playerMesh.mesh.rotation = player.rot;
                    _meshedPlayers[player.id] = playerMesh;
                    _lockLoadingPlayer[player.id] = false;
                })
            )
        }
        else {
            _meshedPlayers[player.id].mesh.position = player.pos;
            _meshedPlayers[player.id].mesh.rotation = player.rot;
        }
    }
    return Promise.all(promises);
}
async function updateServer() {
    if (_updating || !_myid) {
        return Promise.resolve();
    }
    _updating = true;
    let body = JSON.stringify({
        id: _myid,
        pos: [_camera.position.x, _camera.position.y, _camera.position.z],
        rot: [_camera.rotation.x, _camera.rotation.y, _camera.rotation.z]
    })
    return fetch(`${host}gamestatus/update`,  {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: body
    }).then(response=> {
        _updating = false;
    })
}
async function getPlayers() {
    return fetch(`${host}gamestatus/getallplayers`).then(response=> {return response.text()}).then(text => {
        let json = JSON.parse(text);
        let tempArr = [];
        for(let pid in json) {
            let stats = json[pid];
            tempArr.push({
                id: pid,
                pos: new Vector3(stats.pos[0],stats.pos[1],stats.pos[2]),
                rot: new Vector3(stats.rot[0], stats.rot[1] , stats.rot[2])
                // pos: new Vector3(10*Math.sin(_frame/180*Math.PI) + stats.pos[0],stats.pos[1],10*Math.cos(_frame/180*Math.PI) + stats.pos[2]),
                // rot: new Vector3(stats.rot[0], stats.rot[1] + Math.PI/2 + _frame/180*Math.PI, 0)
            })
        }
        _players = tempArr;
    }).then(() => {
        updatePlayers()
    })
}
function createGround() {
    let ground = MeshBuilder.CreateGround("ground", { width: 1000, height: 1000, subdivisions: 10, updatable: false }, _gameScene);
    ground.checkCollisions = true;

    const groundMat = new StandardMaterial("groundMat", _gameScene);
    const texture = new Texture("./textures/cobblestone_large_01_diff_1k.jpeg", _gameScene);
    groundMat.diffuseTexture = texture;
    groundMat.diffuseTexture.uScale = 100;
    groundMat.diffuseTexture.vScale = 100;
    ground.material = groundMat;
}
async function loadCharacter(id) {
    //collision mesh
    const outer = MeshBuilder.CreateBox("outer-" + id, { width: 2, depth: 1, height: 3 }, _gameScene);
    outer.isVisible = false;
    outer.isPickable = false;
    outer.checkCollisions = true;

    outer.bakeTransformIntoVertices(Matrix.Translation(0, 1, 0))
    outer.ellipsoid = new Vector3(1, 1, 1);
    outer.ellipsoidOffset = new Vector3(0, 1, 0);

    var anchor = new AbstractMesh(id, _gameScene);
    anchor.billboardMode = Mesh.BILLBOARDMODE_ALL;
    anchor.position.y = 3.5;
    anchor.parent = outer;

    var button = new HolographicButton("down");
    _gui3dmanager.addControl(button);
    button.linkToTransformNode(anchor);
    button.backMaterial.alpha = 0.0

    var buttonText = new TextBlock();
    buttonText.text = id;
    buttonText.fontWeight = "bold";
    buttonText.color = "yellow";
    buttonText.fontSize = 108;
    button.content = buttonText;

    //--IMPORTING MESH--
    return SceneLoader.ImportMeshAsync(null, "./models/player.glb", null, _gameScene).then((result) =>{
        const root = result.meshes[0];
        //body is our actual player mesh
        const body = root;
        body.parent = outer;
        body.isPickable = false;
        body.getChildMeshes().forEach(m => {
            m.isPickable = false;
        })

        //return the mesh and animations
        return {
            mesh: outer,
            animationGroups: result.animationGroups
        }
    });
}

const createLoadingScene = (engine) => {
    let scene = new Scene(engine);
    var camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene);

    // This targets the camera to scene origin
    camera.setTarget(Vector3.Zero());

    // This attaches the camera to the canvas
    camera.attachControl(_canvas, true);

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    var light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);

    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 0.7;


    _adt = AdvancedDynamicTexture.CreateFullscreenUI("myUI");
    let panel = new StackPanel();
    panel.spacing = 40;
    // Only accepts numerical keys
    let input1 = new InputText();
    input1.width = "300px";
    input1.maxWidth = 0.2;
    input1.height = "40px";
    input1.text = "";
    input1.color = "white";
    input1.background = "green";
    input1.placeholderText = "Put some ID here"
    panel.addControl(input1);

    let joinButton = Button.CreateSimpleButton("joinButton", "Join");
    joinButton.width = "70px";
    joinButton.height = "40px";
    joinButton.color = "white";
    joinButton.background = "green";
    joinButton.onPointerClickObservable.add(() => {
        // click to register and enter game
        let text = input1.text.trim();
        if (text == "") {
            return;
        }
        else {
            enterGame(text)
        }
    })
    panel.addControl(joinButton)

    _adt.addControl(panel);
    return scene;
}
const enterGame = (id) => {
    return fetch(`${host}gamestatus/register?id=${id}`)
        .then(response => {return response.text()})
        .then(jsonText => {
            let json = JSON.parse(jsonText);
            if (json.error) {
                console.log(json.error);
                return Promise.resolve();
            }
            _loadingScene.dispose();
            _gamestates = 1;
            _myid = json.id;
            _camera.position = new Vector3(json.stats.pos[0],json.stats.pos[1],json.stats.pos[2])
            _camera.rotation = new Vector3(json.stats.pos[1],json.stats.pos[2],json.stats.pos[3])
            return Promise.resolve();
        })
}

async function logout(){
    if (!_myid) {
        return Promise.resolve();
    }
    return fetch(`${host}gamestatus/logout?id=${_myid}`)
}
const onLoad = () => {
    // Get the canvas DOM element
    _canvas = document.getElementById('plagroundCanvas');
    _canvas.width = 1600; //document.width is obsolete
    _canvas.height = 900; //document.height is obsolete
    // Load the 3D engine
    let engine = new Engine(_canvas, true, {preserveDrawingBuffer: true, stencil: true});
    
    // create loading scene first
    _loadingScene = createLoadingScene(engine);
    _gameScene = createGameScene(engine, _canvas);
    createGround()
    engine.runRenderLoop(()=>{
        if (_gamestates == 0) {
            _loadingScene.render()
        }
        else if (_gamestates == 1){
            _frame++;
            if (_frame%20 == 0) {
                getPlayers()
            }
            if (_frame %20 == 0) {
                updateServer();
            }
            _gameScene.render();
        }
    });
    window.addEventListener('resize', function(){
        engine.resize();
    });
    window.addEventListener('beforeunload', logout);
}

function App() {
    useEffect(onLoad.bind(this));
    return (
    <div className="App">
        <p>CALL OF DUMMY</p>
        <canvas id="plagroundCanvas"></canvas>
    </div>
    );
}

export default App;

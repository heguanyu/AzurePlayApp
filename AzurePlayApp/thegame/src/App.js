import './App.css';
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import {GUI3DManager, HolographicButton, TextBlock, AdvancedDynamicTexture, InputText, StackPanel, Button, Image} from "@babylonjs/gui"
import React, { useState, useEffect } from 'react';
import { Ray, ActionManager, ExecuteCodeAction, Engine, Scene, Vector3, Vector4, Mesh, StandardMaterial, Texture, Color3, Color4, AbstractMesh, GlowLayer, PointLight, FreeCamera, CubeTexture, Sound, PostProcess, Effect, SceneLoader, Matrix, MeshBuilder, Quaternion, AssetsManager, HemisphericLight, UniversalCamera }  from "@babylonjs/core";


let _frame=0, _camera = null, _players= {}, _meshedPlayers={}, _lockLoadingPlayer={}, _updating = false, _myid = null, _bots = {}, _meshedBots={}, _lockLoadingBot={};
let _canvas, _gameScene = null, _loadingScene = null, _adt = null, _gameadt = null;
// 0=input name; 1=game
let _gamestates = 0;
let _gui3dmanager = null;
const host = "http://localhost:8089/"
const meshFileNames = {
    "player": {
        fileName: "player.glb",
        scale: 1.0,
        offset: new Vector3(0,0,0),
        boundingSize: new Vector3(2,1,3)
    },
    "bot0": {
        fileName: "player.glb",
        scale: 1,
        offset: new Vector3(0,0,0),
        boundingSize: new Vector3(2,1,3)
    },
    "bot1": {
        fileName: "seagulf.glb",
        scale: 0.005,
        offset: new Vector3(0,0,-3),
        boundingSize: new Vector3(2,1,3)
    },
    "bot2": {
        fileName: "ufo.glb",
        scale: 5.0,
        offset: new Vector3(0,1.8,0),
        boundingSize: new Vector3(4,4,1)
    },
    "bot3": {
        fileName: "aerobatic_plane.glb",
        scale: 20.0,
        offset: new Vector3(0,2.1,0),
        boundingSize: new Vector3(4,4,1)
    }
};

// const host = ""
const createGameScene = (engine) => {
    // Create a basic BJS Scene object
    let scene = new Scene(engine);
    _gui3dmanager = new GUI3DManager(scene);
    _gameadt = AdvancedDynamicTexture.CreateFullscreenUI("UI");
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

    const skyboxTexture = new CubeTexture("textures/environment.env", scene);
    scene.createDefaultSkybox(skyboxTexture, true, 1000, 0)

    // Create a built-in "ground" shape;

    var aim = new Image("but", "textures/redaim.png");
    aim.width = "30px";
    aim.height = "30px";
    _gameadt.addControl(aim);

    // Pointer lock
    scene.onPointerDown = (e) => {
        if (e.button == 0 && _gamestates == 1) {
            engine.enterPointerlock();
        }
        else {
            engine.exitPointerlock();
        }

        const origin = _camera.globalPosition.clone();
        const forward = _camera.getDirection(Vector3.Forward());
        const ray = new Ray(origin, forward, 200);

        const hit = scene.pickWithRay(ray);
        if (hit && hit.pickedMesh) {
            hitTarget(hit.pickedMesh.name);
        }

    }
    // Return the created scene
    return scene;
}
async function hitTarget(target) {
    fetch(`${host}gamestatus/hittarget?target=${target}`).then((response)=>{
        if (!response.error) {
            if (_bots[target]) {
                _bots[target].hp--;
            }
            else if (_players[target]){
                _players[target].hp--;
            }
        }
    })
}
function endgame() {
    _gamestates = 0;
    _frame = 0;
}
async function updatePlayers() {
    let promises = [];

    for (let i in _meshedPlayers) {
        if (!_players[i]) {
            _meshedPlayers[i].mesh.dispose();
            delete _meshedPlayers[i]
        }
    }
    if (!_players[_myid]) {
         endgame();
         return Promise.resolve();
    }
    for(let i in _players) {
        let player = _players[i];
        if (_lockLoadingPlayer[player.id] || player.id == _myid) {
            continue;
        }
        const playerId = player.id;
        if (!_meshedPlayers[player.id]) {
            _lockLoadingPlayer[player.id] = true;
            promises.push(
                loadCharacter(player.id, "player").then(playerMesh => {
                    playerMesh.mesh.position = player.pos;
                    playerMesh.mesh.rotation = player.rot;
                    playerMesh.hp = player.hp;
                    playerMesh.fullHp = player.fullHp;
                    _meshedPlayers[playerId] = playerMesh;
                    _lockLoadingPlayer[playerId] = false;
                })
            )
        }
        else {
            _meshedPlayers[playerId].hp = player.hp;
            _meshedPlayers[playerId].fullHp = player.fullHp;
            _meshedPlayers[playerId].buttonText.text = `${player.id} ${player.hp}/${player.fullHp}`
            _meshedPlayers[playerId].mesh.position = player.pos;
            _meshedPlayers[playerId].mesh.rotation = player.rot;
        }
    }
    return Promise.all(promises);
}
async function updateBots() {
    let promises = [];
    for (let i in _meshedBots) {
        if (!_bots[i]) {
            _meshedBots[i].mesh.dispose();
            delete _meshedBots[i]
        }
    }
    for(let i in _bots) {
        let bot = _bots[i];
        if (_lockLoadingBot[bot.id]) {
            continue;
        }
        const botid = bot.id;
        if (!_meshedBots[botid]) {
            _lockLoadingBot[botid] = true;
            promises.push(
                loadCharacter(botid, bot.type).then(botMesh => {
                    botMesh.mesh.position = bot.pos;
                    botMesh.mesh.rotation = bot.rot;
                    botMesh.hp = bot.hp;
                    botMesh.fullHp = bot.fullHp;
                    _meshedBots[botid] = botMesh;
                    _lockLoadingBot[botid] = false;
                })
            )
        }
        else {
            _meshedBots[botid].hp = bot.hp;
            _meshedBots[botid].fullHp = bot.fullHp;
            _meshedBots[botid].buttonText.text = `${bot.id} ${bot.hp}/${bot.fullHp}`
            _meshedBots[botid].mesh.position = new Vector3(10*Math.sin(_frame/180/bot.speed*Math.PI) + bot.pos.x,bot.pos.y,10*Math.cos(_frame/180/bot.speed*Math.PI) + bot.pos.z);
            _meshedBots[botid].mesh.rotation = new Vector3(0, -Math.PI/2 + _frame/180/bot.speed*Math.PI, 0);
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
        let tempMap = {};
        for(let pid in json) {
            let stats = json[pid];
            tempMap[pid] = {
                id: pid,
                hp: stats.hp,
                fullHp: stats.fullHp,
                pos: new Vector3(stats.pos[0], stats.pos[1], stats.pos[2]),
                rot: new Vector3(stats.rot[0], -Math.PI + stats.rot[1], stats.rot[2])
            }
        }
        _players = tempMap;
        return updatePlayers();
    })
}
async function getBots() {
    return fetch(`${host}gamestatus/getallbots`).then(response=> {return response.text()}).then(text => {
        let json = JSON.parse(text);
        let tempMap = {};
        for(let botid in json) {
            let stats = json[botid];
            tempMap[botid] = {
                id: botid,
                type: stats.type,
                hp: stats.hp,
                fullHp: stats.fullHp,
                speed: stats.speed,
                pos: new Vector3(stats.pos[0], stats.pos[1], stats.pos[2]),
                rot: new Vector3(stats.rot[0], stats.rot[1], stats.rot[2])
            }
        }
        _bots = tempMap;
        return updateBots()
    })
}
function createGround() {
    let ground = MeshBuilder.CreateGround("ground", { width: 1000, height: 1000, subdivisions: 10, updatable: false }, _gameScene);
    ground.checkCollisions = true;
    ground.isPickable = false;

    const groundMat = new StandardMaterial("groundMat", _gameScene);
    const texture = new Texture("./textures/cobblestone_large_01_diff_1k.jpeg", _gameScene);
    groundMat.diffuseTexture = texture;
    groundMat.diffuseTexture.uScale = 100;
    groundMat.diffuseTexture.vScale = 100;
    ground.material = groundMat;
}
async function loadCharacter(id, type) {
    //--IMPORTING MESH--
    let meshMetadata = meshFileNames[type] || meshFileNames["0"];
    //collision mesh
    const outer = MeshBuilder.CreateBox(id, { width: meshMetadata.boundingSize.x, depth: meshMetadata.boundingSize.y, height: meshMetadata.boundingSize.z }, _gameScene);
    var invisibleMat = new StandardMaterial("mat", _gameScene);
    invisibleMat.alpha = 0;
    outer.material = invisibleMat;

    outer.isPickable = true;
    outer.checkCollisions = true;

    outer.bakeTransformIntoVertices(Matrix.Translation(0 + meshMetadata.offset.x, 1+ meshMetadata.offset.y, 0+ meshMetadata.offset.z))
    outer.ellipsoid = new Vector3(1, 1, 1);
    outer.ellipsoidOffset = new Vector3(0, 1, 0);

    var anchor = new AbstractMesh(id, _gameScene);
    anchor.billboardMode = Mesh.BILLBOARDMODE_ALL;
    anchor.position.y = 3.5;
    anchor.parent = outer;

    var button = new HolographicButton("down");
    _gui3dmanager.addControl(button);
    button.linkToTransformNode(anchor);
    button.backMaterial.alpha = 0.0;

    var buttonText = new TextBlock();
    buttonText.text = id;
    buttonText.fontWeight = "bold";
    buttonText.color = "yellow";
    buttonText.fontSize = 54;
    button.content = buttonText;

    return SceneLoader.ImportMeshAsync(null, "./models/", meshMetadata.fileName, _gameScene).then((result) =>{
        //body is our actual player mesh
        const body = result.meshes[0];
        body.isPickable = false;
        body.scaling = new Vector3(meshMetadata.scale, meshMetadata.scale, meshMetadata.scale)
        body.parent = outer;
        body.getChildMeshes().forEach(m => {
            m.isPickable = false;
        })

        //return the mesh and animations
        return {
            buttonText: buttonText,
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
                return Promise.resolve();
            }
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
            if (_frame%10 == 0) {
                getPlayers()
            }
            if (_frame % 30 == 0) {
                getBots();
            }
            else {
                updateBots();
            }
            if (_frame %10 == 0) {
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

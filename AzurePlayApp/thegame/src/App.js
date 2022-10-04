import './App.css';
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import React, { useState, useEffect } from 'react';
import { Engine, Scene, Vector3, Vector4, Mesh, StandardMaterial, Texture, Color3, Color4, ShadowGenerator, GlowLayer, PointLight, FreeCamera, CubeTexture, Sound, PostProcess, Effect, SceneLoader, Matrix, MeshBuilder, Quaternion, AssetsManager, HemisphericLight, UniversalCamera }  from "@babylonjs/core";

let _enemy = null, _frame=0, _camera = null;
const createScene = (engine, canvas) => {
    // Create a basic BJS Scene object
    let scene = new Scene(engine);

    // gravity
    const fps = 60
    const gravity = -9.81;
    scene.gravity = new Vector3(0, gravity/fps, 0);
    scene.collisionsEnabled = true;

    _camera = new UniversalCamera('camera1', new Vector3(0, 1, 5), scene);
    _camera.setTarget(Vector3.Zero());
    _camera.attachControl(canvas, false);

    _camera.applyGravity = true;
    _camera.checkCollisions = true;
    _camera.ellipsoid = new Vector3(1,1,1);

    _camera.minZ = 0.45;
    _camera.speed = 0.5;
    _camera.angularSensibility = 4000;

    _camera.keysUp.push(87);
    _camera.keysLeft.push(65);
    _camera.keysDown.push(83);
    _camera.keysRight.push(68);

    // Create a basic light, aiming 0, 1, 0 - meaning, to the sky
    let light = new HemisphericLight('light1', new Vector3(0, 1, 0), scene);

    loadCharacter(scene).then((enemy) => {
        _enemy = enemy;
    })

    // Create a built-in "ground" shape;
    let ground = MeshBuilder.CreateGround("ground", { width: 1000, height: 1000, subdivisions: 10, updatable: false }, scene);
    ground.checkCollisions = true;
    ground.material = createGroundMaterial(scene)

    // Pointer lock
    scene.onPointerDown = (e) => {
        if (e.button == 0) {
            engine.enterPointerlock();
        }
        else {
            engine.exitPointerlock();
        }
    }
    // Return the created scene
    return scene;
}
async function getPlayers() {
    
}

const onLoad = () => {
  // Get the canvas DOM element
  let canvas = document.getElementById('plagroundCanvas');    
  canvas.width = 1600; //document.width is obsolete
  canvas.height = 900; //document.height is obsolete
  // Load the 3D engine
  let engine = new Engine(canvas, true, {preserveDrawingBuffer: true, stencil: true});
  // CreateScene function that creates and return the scene

  // call the createScene function
  let scene = createScene(engine, canvas);
  // run the render loop
  engine.runRenderLoop(()=>{
      // Move the man
      _frame++;
      if (_frame%20 == 0) {
          // console.log(_camera.rotation)
      }
      if (_enemy) {
          _enemy.mesh.position = new Vector3(10*Math.sin(_frame/180*Math.PI),_enemy.mesh.position.y,10*Math.cos(_frame/180*Math.PI))
          _enemy.mesh.rotation = new Vector3(0,Math.PI/2 + _frame/180*Math.PI, 0)
      }
      scene.render();
  });
  // the canvas/window resize event handler
  window.addEventListener('resize', function(){
      engine.resize();
  });
}
function createGroundMaterial(scene) {
    const groundMat = new StandardMaterial("groundMat", scene);
    const texture = new Texture("./textures/cobblestone_large_01_diff_1k.jpeg", scene);
    groundMat.diffuseTexture = texture;
    groundMat.diffuseTexture.uScale = 100;
    groundMat.diffuseTexture.vScale = 100;

    return groundMat;
}

async function loadCharacter(scene) {
    //collision mesh
    const outer = MeshBuilder.CreateBox("outer", { width: 2, depth: 1, height: 3 }, scene);
    outer.isVisible = false;
    outer.isPickable = false;
    outer.checkCollisions = true;

    outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0))
    outer.ellipsoid = new Vector3(1, 1.5, 1);
    outer.ellipsoidOffset = new Vector3(0, 1.5, 0);

    //--IMPORTING MESH--
    return SceneLoader.ImportMeshAsync(null, "./models/player.glb", null, scene).then((result) =>{
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

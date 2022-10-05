const express = require('express')
const gamestatus = express.Router()
const playerService = require("./playerService.js")

gamestatus.post('/update', (req, res) => {
    let info = req.body;
    if (!info || !info.id) {
        res.status(200).send();
        return;
    }
    playerService.updatePlayer(info.id, info.pos, info.rot);
    res.status(200).send()
});
gamestatus.get('/register', (req, res) => {
    let id = req.query["id"];
    if (!id) {
        res.status(200).send();
        return;
    }
    let result = playerService.createPlayer(id);
    console.log(result)
    if (result.error) {
        return res.send({error: result.error})
    }
    else {
        return res.send({
            id: id,
            stats: result
        })
    }
});

gamestatus.get('/logout', (req, res) => {
    let id = req.query["id"];
    if (!id) {
        res.status(200).send();
        return;
    }
    playerService.removePlayer(id);
    return res.send("successfully logged out");
})

gamestatus.get('/getallplayers', (req, res) => {
    res.send(playerService.getAllPlayers())
});


module.exports = gamestatus;
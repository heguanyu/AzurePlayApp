const _players = {};

function updatePlayer(pid, pos, rot) {
    if (!_players[pid]) {
        return;
    }
    _players[pid] = {
        pos: pos,
        rot: rot
    }
}

function createPlayer(pid) {
    if (_players[pid]) {
        return {
            error: "Already exists"
        };
    }
    _players[pid] = {
        pos: [Math.random()*200 - 100, 0.5 , Math.random()*200 - 100],
        rot: [0, 0, 0]
    }
    return _players[pid]
}

function getAllPlayers() {
    return _players
}
function removePlayer(pid) {
    delete _players[pid];
}

module.exports = {
    updatePlayer: updatePlayer,
    createPlayer: createPlayer,
    getAllPlayers: getAllPlayers,
    removePlayer:removePlayer
}
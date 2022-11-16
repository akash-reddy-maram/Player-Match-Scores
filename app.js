const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//API 1
app.get("/players/", async (request, response) => {
  const getAllPlayers = `SELECT * FROM player_details ORDER BY player_id;`;
  const playersDetailsList = await db.all(getAllPlayers);
  const allPlayersResponse = playersDetailsList.map((eachObj) => {
    return {
      playerId: eachObj.player_id,
      playerName: eachObj.player_name,
    };
  });
  response.send(allPlayersResponse);
});

//API 2
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerById = `SELECT * FROM player_details WHERE player_id=${playerId};`;
  const playerObj = await db.get(getPlayerById);
  response.send({
    playerId: playerObj.player_id,
    playerName: playerObj.player_name,
  });
});

//API 3
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerDetails = request.body;
  const { playerName } = playerDetails;
  const updatePlayerQuery = `UPDATE player_details SET 
    player_name='${playerName}'
    WHERE player_id=${playerId};
    `;
  await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

//API 4
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `SELECT * FROM match_details WHERE match_id=${matchId};`;
  const matchObj = await db.get(getMatchQuery);
  response.send({
    matchId: matchObj.match_id,
    match: matchObj.match,
    year: matchObj.year,
  });
});

//API 5
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getMatchesOfPlayerQuery = `SELECT match_details.match_id AS matchId, 
  match,year FROM player_match_score INNER JOIN match_details ON 
    player_match_score.match_id = match_details.match_id
    WHERE player_match_score.player_id=${playerId};`;
  const allMatchesList = await db.all(getMatchesOfPlayerQuery);
  response.send(allMatchesList);
});

//API 6
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getPlayersOfMatchQuery = `SELECT 
  player_details.player_id AS playerId,
player_details.player_name AS playerName
  FROM 
    player_details NATURAL JOIN player_match_score 
    WHERE player_match_score.match_id=${matchId};`;
  const allPlayersOfMatch = await db.all(getPlayersOfMatchQuery);
  response.send(allPlayersOfMatch);
});

//API 7
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerStats = `
  SELECT 
    player_details.player_id,
    player_details.player_name,
    sum(score),
    sum(fours),
    sum(sixes)
    FROM player_match_score INNER JOIN player_details 
    ON
    player_details.player_id=player_match_score.player_id
    GROUP BY player_details.player_id
    HAVING player_match_score.player_id=${playerId};`;
  const playerStats = await db.get(getPlayerStats);
  response.send({
    playerId: playerStats.player_id,
    playerName: playerStats.player_name,
    totalScore: playerStats["sum(score)"],
    totalFours: playerStats["sum(fours)"],
    totalSixes: playerStats["sum(sixes)"],
  });
});

module.exports = app;

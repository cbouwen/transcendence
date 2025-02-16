from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from .active_player_manager import active_player_manager

app = FastAPI()

class Player(BaseModel):
    name: str
    matchmaking_rating: float

@app.post("/players/")
def add_player(player: Player):
    active_player_manager.add_player(player)
    return {"message": f"Player {player.name} added successfully."}

@app.delete("/players/{player_name}")
def remove_player(player_name: str):
    if player_name in active_player_manager.active_players:
        active_player_manager.remove_player(player_name)
        return {"message": f"Player {player_name} removed successfully."}
    else:
        raise HTTPException(status_code=404, detail="Player not found")

@app.get("/players/next_match")
def find_next_match():
    match = active_player_manager.find_next_match()
    if match:
        return {"player1": match[0], "player2": match[1]}
    else:
        raise HTTPException(status_code=404, detail="No match found")

@app.post("/players/refresh_histories")
def refresh_all_players():
    active_player_manager.refresh_all_players_match_histories()
    return {"message": "All player match histories refreshed successfully."}

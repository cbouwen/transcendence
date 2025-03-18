import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.roomGroupName = "chat"
        await self.channel_layer.group_add(
            self.roomGroupName ,
            self.channel_name
        )
        await self.accept()
    async def disconnect(self , close_code):
        await self.channel.name.group_discard(
            self.roomGroupName , 
            self.channel_name 
        )
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]
        username = text_data_json["username"]
        target = text_data_json["target"]
        await self.channel_layer.group_send(
            self.roomGroupName,{
                "type" : "sendMessage" ,
                "message" : message , 
                "username" : username ,
                "target" : target ,
            })
    async def sendMessage(self , event) : 
        message = event["message"]
        username = event["username"]
        target = event["target"]
        await self.send(text_data = json.dumps({"message":message ,"username":username ,"target":target}))
      

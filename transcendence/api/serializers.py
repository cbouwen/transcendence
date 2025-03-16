from django.contrib.auth import get_user_model
from rest_framework import serializers
from pong.models import PongScore

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'
        depth = 3

    def update(self, instance, validated_date):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

class PongScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = PongScore
        fields = '__all__'
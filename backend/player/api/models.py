from django.db import models


class Player(models.Model):
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    avatar = models.URLField(null=True, blank=True)
    champions = models.IntegerField(default=0)
    wins = models.IntegerField(default=0)
    losses = models.IntegerField(default=0)
    two_factor = models.BooleanField(default=False)
    STATE_CHOICES = [
        ('OF', 'Offline'),
        ('ON', 'Online'),
        ('IG', 'In-game'),
    ]
    state = models.CharField(max_length=2, choices=STATE_CHOICES, default='OF')

    def __str__(self):
        return self.username

class Friendship(models.Model):
    player_sender = models.ForeignKey(Player, related_name='friend_requests_sent', on_delete=models.CASCADE)
    player_receiver = models.ForeignKey(Player, related_name='friend_requests_received', on_delete=models.CASCADE)
    STATE_CHOICES = [
        ('PN', 'Pending'),
        ('AC', 'Accepted'),
    ]
    state = models.CharField(max_length=2, choices=STATE_CHOICES, default='PN')

    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('player_sender', 'player_receiver')

    def __str__(self):
        return f"{self.player_sender.username} -> {self.player_receiver.username} ({self.get_state_display()})"

class Tournament(models.Model):
    name = models.CharField(max_length=100)
    created = models.DateTimeField(auto_now_add=True)
    STATUS_CHOICES = [
        ('PN', 'Pending'),
        ('BG', 'Begin'),
        ('FN', 'Finish'),
    ]
    status = models.CharField(max_length=2, choices=STATUS_CHOICES, default='PN')
    ROUND_CHOICES = [
        ('QU', 'Quarter'),
        ('HF', 'Half'),
        ('FN', 'Final'),
    ]
    current_round = models.CharField(max_length=2, choices=ROUND_CHOICES, null=True, blank=True)

    def __str__(self):
        return self.name

class PlayerTournament(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)
    creator = models.BooleanField(default=False)  # Si le joueur est le créateur du tournoi

    class Meta:
        unique_together = ('player', 'tournament')

    def __str__(self):
        return f"{self.player.username} in {self.tournament.name}"

class Match(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    state = models.CharField(max_length=20, choices=[('UPL', 'Unplayed'), ('PLY', 'Played')], default='UPL')
    tournament = models.ForeignKey(Tournament, on_delete=models.SET_NULL, null=True, blank=True)
    moves = models.JSONField(null=True, blank=True)  # Pour enregistrer les mouvements dans une partie
    ROUND_CHOICES = [
        ('QU', 'Quarter'),
        ('HF', 'Half'),
        ('FN', 'Final'),
    ]
    round = models.CharField(max_length=2, choices=ROUND_CHOICES, null=True, blank=True)

    def __str__(self):
        return f"Match {self.id} ({self.get_state_display()})"


class PlayerMatch(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    match = models.ForeignKey(Match, on_delete=models.CASCADE)
    score = models.IntegerField(default=0)  # Score du joueur dans le match (facultatif)
    is_winner = models.BooleanField(default=False)  # Indique si le joueur a gagné ce match

    class Meta:
        unique_together = ('player', 'match')

    def __str__(self):
        return f"{self.player.username} in Match {self.match.id}"

class ChatMessage(models.Model):
    sender = models.ForeignKey(Player, related_name='sent_messages', on_delete=models.CASCADE)
    receiver = models.ForeignKey(Player, related_name='received_messages', on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

class BlockedUser(models.Model):
    blocker = models.ForeignKey(Player, related_name='blocked_by', on_delete=models.CASCADE)
    blocked = models.ForeignKey(Player, related_name='blocked_users', on_delete=models.CASCADE)

    class Meta:
        unique_together = ('blocker', 'blocked')
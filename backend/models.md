# Models Documentation

## Player Model

The Player model extends Django's AbstractBaseUser for user authentication and game stats tracking.

### Fields

- `id`: AutoField (Primary Key)
- `email`: EmailField (unique, max 30 chars)
- `username`: CharField (unique, max 20 chars)
- `first_name`: CharField (max 20 chars)
- `last_name`: CharField (max 20 chars)
- `alias_name`: CharField (optional, max 20 chars)
- `avatar`: URLField (defaults to local avatar)
- `champions`: IntegerField
- `wins`: IntegerField
- `losses`: IntegerField
- `two_factor`: BooleanField
- `status`: CharField (choices: ONLINE, OFFLINE, INGAME)
- `is_active`: BooleanField

## Friendship Model

Manages friend relationships between players.

### Fields

- `player_sender`: ForeignKey to Player
- `player_receiver`: ForeignKey to Player
- `state`: CharField (choices: Pending, Accepted)
- `created`: DateTimeField

## Tournament Model

Handles tournament organization and progression.

### Fields

- `name`: CharField
- `created`: DateTimeField
- `status`: CharField (choices: Pending, Begin, Finish)
- `current_round`: CharField (choices: Quarter, Half, Final)

## PlayerTournament Model

Links players to tournaments they participate in.

### Fields

- `player`: ForeignKey to Player
- `tournament`: ForeignKey to Tournament
- `creator`: BooleanField

## Match Model

Represents individual matches in the system.

### Fields

- `created`: DateTimeField
- `state`: CharField (choices: Unplayed, Played)
- `tournament`: ForeignKey to Tournament
- `moves`: JSONField
- `round`: CharField (choices: Quarter, Half, Final)

## PlayerMatch Model

Tracks player participation and results in matches.

### Fields

- `player`: ForeignKey to Player
- `match`: ForeignKey to Match
- `score`: IntegerField
- `is_winner`: BooleanField

## ChatMessage Model

Handles private messages between players.

### Fields

- `sender`: ForeignKey to Player
- `receiver`: ForeignKey to Player
- `content`: TextField
- `timestamp`: DateTimeField
- `is_read`: BooleanField

## BlockedUser Model

Manages user blocking functionality.

### Fields

- `blocker`: ForeignKey to Player
- `blocked`: ForeignKey to Player

## API Usage Examples

```python
# Create new player
player = Player.objects.create(
    email="player@example.com",
    username="player1",
    first_name="John",
    last_name="Doe"
)

# Create tournament
tournament = Tournament.objects.create(
    name="Championship 2024"
)

# Create match
match = Match.objects.create(
    tournament=tournament,
    round='QU'
)

# Send friend request
friendship = Friendship.objects.create(
    player_sender=player1,
    player_receiver=player2
)
```

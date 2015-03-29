var elo = {
  k: 32,
  initialScore: 400,
  calcScore: function(result, scoreA, scoreB) {
    // result: 0 if A wins, 1 if B wins
    // returns: [new score for A, new score for B]
    return [rank(result ^ 1, scoreA, expectedScore(scoreA, scoreB)),
    rank(result ^ 0, scoreB, expectedScore(scoreB, scoreA))];
  }
}

var expectedScore = function(ratingA, ratingB) {
  // returns expected score for A
  return 1/(1 + Math.pow(10, (ratingB - ratingA)/elo.initialScore));
}

var rank = function(outcome, rank, expectedScore) {
  return rank + elo.k * (outcome - expectedScore);
}

module.exports = elo

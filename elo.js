module.exports = {
  k: 0.32,
  calcScore: function(result, scoreA, scoreB) {
    // dummy equations, not true elo
    return [scoreA * (1+this.k), scoreB * (1-this.k)];
  }
}

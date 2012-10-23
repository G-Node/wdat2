String.prototype.startsWith = function (leader) {
  return this.substr(0, leader.length) === leader;
}


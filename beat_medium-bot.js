function distance(a, b) {
  return Math.sqrt(
    (a.position[0] - b.position[0]) ** 2 + (a.position[1] - b.position[1]) ** 2
  );
}

function beamable(a, b) {
  if (a.structure_type == "star" && a.energy == 2) return false;
  if (b.structure_type == "star" && b.energy == 2) return false;

  d = distance(a, b);
  return distance(a, b) < 195;
}

function beamable_enemy(s) {
  if (s.sight.enemies.length === 0) {
    return false;
  }
  for (enemy of s.sight.enemies) {
    if (beamable(s, spirits[enemy])) {
      return spirits[enemy];
    }
  }
  return false;
}

function beam_any_enemy(s) {
  if (s.sight.enemies.length == 0) return false;

  can_beam = false;
  weak_enemy = false;
  weak_point = 10000;
  for (enemy of s.sight.enemies) {
    if (!beamable(s, spirits[enemy])) continue;
    if (spirits[enemy].energy < weak_point) {
      can_beam = true;
      weak_enemy = enemy;
      weak_point = spirits[enemy].energy;
    }
  }

  if (!can_beam) return false;
  s.energize(spirits[weak_enemy]);
  s.set_mark("battle");
  return true;
}

function beam_enemy(s, enemy) {
  if (s.sight.enemies.length == 0) return false;

  if (!beamable(s, spirits[enemy])) {
    s.move(spirits[enemy].position);
    return false;
  }
  return true;
}

function beam_friend_label(s, status) {
  // status 中の友軍機へ供給
  if (s.sight.friends.length == 0) {
    return false;
  }
  for (friend of s.sight.friends) {
    if (spirits[friend].mark != status) continue;
    if (spirits[friend].energy == spirits[friend].energy_capacity) continue;
    if (
      beamable(s, spirits[friend]) &&
      spirits[friend].energy != spirits[friend].energy_capacity
    ) {
      s.energize(spirits[friend]);
      return true;
    }
  }
  return false;
}

function stop_and_beam(from, to) {
  if (!beamable(from, to)) {
    if (from.structure_type == "star") {
      to.move(from.position);
    } else {
      from.move(to.position);
    }
  } else {
    if (to.structure_type == "star") return;
    if (from.structure_type == "star") {
      to.energize(to);
      return;
    } else if (to.energy == to.energy_capacity) {
      from.move([2100, 1200]);
      return;
    } else from.energize(to);
  }
  return;
}

function farming(s, from, to) {
  s.shout("farmer");
  if (s.energy == s.energy_capacity) {
    s.set_mark("collected");
  } else if (s.energy == 0) {
    s.set_mark("collecting");
  }

  if (s.mark == "collecting") {
    stop_and_beam(from, s);
    return;
  }

  if (beam_any_enemy(s)) return;
  if (beam_friend_label(s, "battle")) return;
  if (beam_friend_label(s, "attacker")) return;
  if (beam_friend_label(s, "support")) return;

  if (stab_stop(s)) return;
  stop_and_beam(s, to);
  return;
}

function charge(s) {
  if (s.sight.structures.length == 0) return false;

  if (beamable(s, star_zxq) || beamable(s, star_a1c) || beamable(s, star_p89)) {
    s.energize(s);
    return true;
  }

  return false;
}

function defend_position(s, pos, stab = true) {
  s.set_mark("attacker");
  s.shout("attacker");

  if (s.energy != 0 && beam_any_enemy(s)) return true;
  if (beam_friend_label(s, "battle")) return true;
  if (s.energy != s.energy_capacity && charge(s)) return true;
  if (stab_stop(s) && stab) return true;

  // attacker の間でエネルギーを平均化する
  for (friend of s.sight.friends) {
    if (
      spirits[friend].energy < s.energy - 2 &&
      spirits[friend].mark == "attacker"
    ) {
      if (beamable(s, spirits[friend])) {
        s.energize(spirits[friend]);
        return true;
      }
    }
  }

  s.move(pos);
  return false;
}

function search(s) {
  return s.sight.enemies.length > 0;
}

function search_in_group(ss) {
  for (s of ss) {
    if (search(spirits[s])) {
      return true;
    }
  }
  return false;
}

function stab_stop(s) {
  if (s.sight.enemies.length == 0) return false;

  tot = 0;
  for (enemy of s.sight.enemies) {
    if (spirits[enemy].energy < spirits[enemy].energy_capacity / 5) {
      beam_enemy(s, enemy);
      return true;
    }
    tot += spirits[enemy].energy;
  }

  return false;
}

function make_line(s, pos1, pos2, i, tot) {
  s.shout("attacker");
  if (tot == 0) return;
  posx = pos1[0];
  poxy = pos1[1];
  if (tot != 1) {
    x1 = pos1[0];
    x2 = pos2[0];
    y1 = pos1[1];
    y2 = pos2[1];
    posx = ((x1 - x2) / (tot - 1)) * i + x2;
    posy = ((y1 - y2) / (tot - 1)) * i + y2;
  }
  if (beam_any_enemy(s)) return;
  s.move([posx, posy]);
  return;
}

function split_sortie(sortie, member, revers = false) {
  if (revers) {
    wait_sortie = sortie.slice(0, -member);
    sortie = sortie.slice(-member);
    return { sortie, wait_sortie };
  }

  wait_sortie = sortie.slice(member);
  sortie = sortie.slice(0, member);
  return {
    sortie,
    wait_sortie,
  };
}

// setting
if (base.position[0] == 1600) {
  p_pos = 1;
  base_star = star_zxq;
  enemy_star = star_a1c;
  base_front = [1600, 750];
  base_star_front = [1200, 900];
} else {
  p_pos = 2;
  base_star = star_a1c;
  enemy_star = star_zxq;
  base_front = [2600, 1650];
  base_star_front = [3000, 1500];
}

function main() {
  // get list of friendly troops
  wait_sortie = [];
  for (spirit of my_spirits) {
    if (spirit.hp == 0) continue;
    wait_sortie.push(spirit.id);
  }
  console.log("friendly troops: ", wait_sortie.length);

  // outpost condition -----------------------------------------------------
  if (wait_sortie.length >= 25) {
    outpost_invading = true;
  } else if (wait_sortie.length < 20) {
    outpost_invading = false;
  }

  if (
    outpost_invading &&
    outpost.control == "amanou" &&
    outpost.energy >= 500
  ) {
    outpost_progress = true;
  } else if (
    !outpost_invading ||
    outpost.control != "amanou" ||
    outpost.energy <= 300
  ) {
    outpost_progress = false;
  }

  if (
    outpost.control == "amanou" &&
    outpost.energy == 1000 &&
    wait_sortie.length >= 60
  ) {
    outpost_invaded = true;
  } else if (!outpost_progress || wait_sortie.length <= 50) {
    outpost_invaded = false;
  }

  // invading enemy star -------------------------------------------------
  if (!outpost_invaded || wait_sortie.length <= 60) {
    enemy_star_invading = false;
  } else if (wait_sortie.length >= 80) {
    enemy_star_invading = true;
  }

  if (enemy_star_invading) {
    var { sortie, wait_sortie } = split_sortie(wait_sortie, 1);
    observer = spirits[sortie[0]];

    if (p_pos == 2) {
      h = 100;
    } else {
      h = -100;
    }

    observ_posx = enemy_star.position[0] + h;
    observ_posy = enemy_star.position[1] + -1 * h;
    observer.move([observ_posx, observ_posy]);
    observer.shout("observer");
    observer.set_mark("attacker");
    if (
      observer.position[0] == observ_posx &&
      observer.position[1] == observ_posy &&
      observer.sight.enemies == 0
    ) {
      enemy_star_invaded = true;
    } else {
      enemy_star_invaded = false;
    }
  } else {
    enemy_star_invaded = false;
  }
  // battle ======================================================================
  // 基地防衛
  if (base.sight.enemies.length > 0) {
    member = Math.floor(wait_sortie.length / 5);
    var { sortie, wait_sortie } = split_sortie(
      wait_sortie,
      member,
      (revers = true)
    );
    for (id of sortie) {
      s = spirits[id];
      defend_position(s, base.position);
    }
  }

  if (enemy_star_invaded) {
    member = Math.floor(wait_sortie.length / 4);
    var { sortie, wait_sortie } = split_sortie(wait_sortie, member);
    for (id of sortie) {
      s = spirits[id];
      if (defend_position(s, enemy_base.position)) continue;
      s.energize(enemy_base);
    }
  }

  if (enemy_star_invading) {
    member = Math.floor(wait_sortie.length / 4);
    var { sortie, wait_sortie } = split_sortie(wait_sortie, member);
    for (id of sortie) {
      s = spirits[id];
      defend_position(s, enemy_star.position, (stab = false));
    }
  }

  if (outpost_invaded) {
    member = Math.floor(wait_sortie.length / 6);
    var { sortie, wait_sortie } = split_sortie(wait_sortie, member);
    for (id of sortie) {
      s = spirits[id];
      farming(s, star_p89, base);
    }
  }

  if (outpost_progress) {
    member = Math.floor(wait_sortie.length / 4);
    var { sortie, wait_sortie } = split_sortie(wait_sortie, member);
    for (id of sortie) {
      s = spirits[id];
      farming(s, star_p89, outpost);
    }
  }

  if (outpost_invading) {
    member = Math.floor(wait_sortie.length / 5);
    var { sortie, wait_sortie } = split_sortie(wait_sortie, member);
    for (id of sortie) {
      s = spirits[id];
      defend_position(s, star_p89.position);
    }

    member = Math.floor(wait_sortie.length / 7);
    var { sortie, wait_sortie } = split_sortie(wait_sortie, member);
    for (id of sortie) {
      s = spirits[id];
      farming(s, star_p89, outpost);
    }
  }

  // 基地防衛
  if (wait_sortie.length > 25 && !outpost_invaded) {
    member = Math.floor(wait_sortie.length / 5);
    var { sortie, wait_sortie } = split_sortie(
      wait_sortie,
      member,
      (revers = true)
    );
    for (id of sortie) {
      s = spirits[id];
      defend_position(s, base.position);
    }
  }

  // 恒星防衛部隊
  if (wait_sortie.length > 25 && !outpost_invaded) {
    member = Math.floor(wait_sortie.length / 5);
    var { sortie, wait_sortie } = split_sortie(
      wait_sortie,
      member,
      (revers = true)
    );
    for (id of sortie) {
      s = spirits[id];
      defend_position(s, base_star.position);
    }
  }

  // 補給
  for (id of wait_sortie) {
    s = spirits[id];
    farming(s, base_star, base);
  }
}

main();

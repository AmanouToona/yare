function distance(a, b) {
  return Math.sqrt(
    (a.position[0] - b.position[0]) ** 2 + (a.position[1] - b.position[1]) ** 2
  );
}

function beamable(a, b) {
  d = distance(a, b);
  return distance(a, b) < 199;
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

function beam_enemy(s) {
  if (s.sight.enemies.length == 0) return false;

  for (enemy of s.sight.enemies) {
    if (beamable(s, spirits[enemy])) {
      s.energize(spirits[enemy]);
      return true;
    }
  }
  return false;
}

function beam_friend(s, status) {
  // status 中の友軍機へ供給
  if (s.sight.friends.length === 0) {
    return false;
  }
  for (friend of s.sight.friends) {
    if (spirits[friend].mark != status) continue;
    if (spirits[friend].energy == spirits[friend].energy_capacity) continue;
    if (beamable(s, spirits[friend])) {
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
    if (from.structure_type == "star") to.energize(to);
    else from.energize(to);
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

  if (beam_enemy(s)) return;
  if (beam_friend(s, "attack")) return;
  if (beam_friend(s, "support")) return;

  stop_and_beam(s, to);
  return;
}

function defend_base(s) {
  s.set_mark("attack");
  s.shout("attack");

  if (beam_enemy(s)) return;
  s.move(base.position);
}

function charge(s) {
  if (s.sight.structures.length == 0) return false;

  if (beamable(s, star_zxq) || beamable(s, star_a1c) || beamable(s, star_p89)) {
    s.energize(s);
    return true;
  }

  return false;
}

function defend_position(s, pos) {
  s.set_mark("attack");
  s.shout("attack");

  if (s.energy != 0 && beam_enemy(s)) return;
  if (s.energy != s.energy_capacity && charge(s)) return;

  s.move(pos);
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

function make_line(s, pos1, pos2, i, tot) {
  s.shout("attack");
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
  if (beam_enemy(s)) return;
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
  base_star_front = [1200, 1100];
} else {
  p_pos = 2;
  base_star = star_a1c;
  enemy_star = star_zxq;
  base_front = [2600, 1650];
  base_star_front = [3000, 1500];
}

function main() {
  wait_sortie = [];

  for (spirit of my_spirits) {
    if (spirit.hp == 0) continue;
    wait_sortie.push(spirit.id);
  }

  console.log("friendly troops: ", wait_sortie.length);

  if (wait_sortie.length >= 30) {
    outpost_invading = true;
  } else if (wait_sortie.length < 25) {
    outpost_invading = false;
  }

  if (
    outpost_invading &&
    outpost.control == "amanou" &&
    outpost.energy >= 500
  ) {
    outpost_occupation = true;
  } else if (
    !outpost_invading ||
    outpost.control != "amanou" ||
    outpost.energy <= 300
  ) {
    outpost_occupation = false;
  }

  if (outpost.control == "amanou" && outpost.energy == 1000) {
    outpost_govern = true;
  } else if (!outpost_occupation || wait_sortie.length <= 60) {
    outpost_govern = false;
  }

  if (wait_sortie.length >= 100 && outpost_govern) {
    finish_blow = true;
  } else if (wait_sortie.length < 80) {
    finish_blow = false;
  }

  if (finish_blow) {
    for (id of wait_sortie) {
      s = spirits[id];
      s.energize(enemy_base);
      defend_position(s, enemy_base.position);
    }
    return;
  }

  // 恒星エネルギー枯渇時は別の恒星からエネルギーを得る
  if (base_star.energy <= 10) {
    member = 20;
    var { sortie, wait_sortie } = split_sortie(wait_sortie, member);
    for (id of sortie) {
      s = spirits[id];
      farming(s, star_p89, base);
    }
  }

  if (wait_sortie.length >= 80 && outpost_govern) {
    member = 20;
    var { sortie, wait_sortie } = split_sortie(wait_sortie, member);
    for (id of sortie) {
      s = spirits[id];
      defend_position(s, enemy_star.position);
    }
  }

  // outpost
  if (outpost_invading) {
    member = 5;
    var { sortie, wait_sortie } = split_sortie(wait_sortie, member);
    for (id of sortie) {
      s = spirits[id];
      farming(s, star_p89, outpost);
    }
  }

  if (wait_sortie.length >= 30 && outpost_invading) {
    member = 5;
    var { sortie, wait_sortie } = split_sortie(wait_sortie, member);
    for (id of sortie) {
      s = spirits[id];
      farming(s, star_p89, outpost);
    }
  }

  // 基地防衛
  if (wait_sortie.length > 25) {
    member = 4;
    var { sortie, wait_sortie } = split_sortie(
      wait_sortie,
      member,
      (revers = true)
    );

    for (id of sortie) {
      s = spirits[id];
      defend_base(s);
    }
  }

  if (base.sight.enemies.length != 0) {
    member = 6;
    var { sortie, wait_sortie } = split_sortie(
      wait_sortie,
      member,
      (revers = true)
    );

    for (id of sortie) {
      s = spirits[id];
      defend_base(s);
    }
  }

  // 恒星防衛部隊
  if (!outpost_occupation) {
    if (wait_sortie.length > 25) {
      member = 5;
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
  }

  if (search_in_group(wait_sortie)) {
    member = (wait_sortie.length / 3) * 2;
    wait_sortie.slice(-10);
    var { sortie, wait_sortie } = split_sortie(wait_sortie, member);
    for (i in sortie) {
      id = sortie[i];
      s = spirits[id];
      make_line(s, base_front, base_star_front, i, sortie.length);
      s.set_mark("attack");
    }
  }

  if (!outpost_govern) {
    if (wait_sortie.length > 25) {
      member = 10;
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
  }

  // 補給
  for (id of wait_sortie) {
    s = spirits[id];
    farming(s, base_star, base);
  }
}

main();

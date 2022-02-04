function distance(a, b) {
    return Math.sqrt((a.position[0] - b.position[0]) ** 2 + (a.position[1] - b.position[1]) ** 2)
}

function beamable(a, b) {
    d = distance(a, b)
    return distance(a, b) < 190
}

function beamable_enemy(s) {
    if (s.sight.enemies.length === 0) {
        return false
    }
    for (enemy of s.sight.enemies) {
        if (beamable(s, spirits[enemy])) {
            return spirits[enemy]
        }
    }
    return false
}

function beamable_friend(s, status) {
    // status 中の友軍機へ供給
    if (s.sight.friends.length === 0) {
        return false
    }
    for (friend of s.sight.friends) {
        if (spirits[friend].mark != status) continue
        if (spirits[friend].energy == spirits[friend].energy_capacity) continue
        if (beamable(s, spirits[friend])) {
            return spirits[friend]
        }
    }
    return false
}

function stop_and_beam(from, to) {
    if (!beamable(from, to)) {
        if (from.structure_type == "star") {
            to.move(from.position)
        } else {
            from.move(to.position)
        }
    } else {
        if (to.structure_type == "star") return
        if (from.structure_type == "star") to.energize(to)
        else from.energize(to)
    }
    return
}


function farming(s, from, to) {
    s.shout("farmer")
    if (s.energy == s.energy_capacity) {
        s.set_mark("collected")
    } else if (s.energy == 0) {
        s.set_mark("collecting")
    }

    if (s.mark == "collecting") {
        stop_and_beam(from, s)
        return
    }

    friend = beamable_friend(s, "attack")
    if (friend != false) {
        s.energize(friend)
        return
    }

    friend = beamable_friend(s, "support")
    if (friend != false) {
        s.energize(friend)
        return
    }

    stop_and_beam(s, to)
    return
}

function defend(s, base) {
    s.set_mark("attack")
    s.move(base.position)

    if (s.energy < s.energy_capacity / 2) {
        s.energize(s)
        return
    }

    enemy = beamable_enemy(s)

    if (enemy != false) {
        s.energize(enemy)
        return
    }
    s.energize(enemy_base)
}

function fire(s) {
    enemy = beamable_enemy(s)
    if (enemy != false) {
        s.energize(enemy)
        return true
    }
    return false
}

function scramble_attack(s, pos) {
    s.shout("attack")
    s.set_mark("attack")

    attacking = fire(s)
    if (attacking) return

    // 余裕があるなら補給
    if (typeof (pos) != Array && pos.structure_type == "star") {
        stop_and_beam(pos, s)
    }

    s.move(pos)
    return
}

function print(a) {
    console.log(a)
}

function scramble_support(s, pos, base = null) {
    s.shout("support")
    s.set_mark("support")

    attacking = scramble_attack
    if (attacking) return

    // 戦闘中の友軍機には最優先供給
    friend = beamable_friend(s, "attack")
    if (s.energy != 0 && friend != false) {
        s.energize(friend)
        return
    }

    // 余裕があるなら補給
    if (base != null && typeof (base) != Array && base.structure_type == "star") {
        stop_and_beam(base, s)
        return
    }

    s.move(pos)

}

function count_living_friends() {
    count = 0
    for (friend of my_spirits) {
        if (friend.hp > 0) count++;
    }
    return count
}

// setting
if (base.position[0] == 1600) {
    p_pos = 1
    base_star = star_zxq
    attack_pos1 = [1700, 800]
    attack_pos2 = [1400, 1000]
    support_pos1 = [1520, 800]
    support_pos2 = [1210, 1000]
} else {
    p_pos = 2
    base_star = star_a1c
    attack_pos1 = [2500, 1600]
    attack_pos2 = [2900, 1400]
    support_pos1 = [2650, 1700]
    support_pos2 = [2950, 1400]
}

pos_s0 = base_star.position[0]
pos_s1 = base_star.position[1]
pos_b0 = base.position[0]
pos_b1 = base.position[1]

support_pos = [(pos_s0 + pos_b0) / 2, (pos_s1 + pos_b1) / 2]

// counter
tot = count_living_friends()
console.log(tot)

function main() {
    live_splits = []


}

main()


i = -1
for (id in my_spirits) {
    s = my_spirits[id]

    if (s.hp == 0) continue;
    i++;

    if (tot < 20) {
        farming(s, base_star, base)
        continue
    }

    if (false) {
        // scrabmle
        if (i < tot / 6 * 1) {
            scramble_support(s, support_pos1)
        } else if (i < tot / 6 * 2) {
            scramble_support(s, support_pos2)
        } else if (i < tot / 6 * 4) {
            scramble_attack(s, attack_pos1)
        } else {
            scramble_attack(s, attack_pos2)
        }
    }

    if (true) {
        // scrabmle
        if (i < tot / 3 * 1) {
            scramble_support(s, support_pos1)
        } else {
            scramble_attack(s, attack_pos1)
        }
    }

    if (false) {
        // scrabmle
        if (i < tot / 3 * 1) {
            scramble_support(s, support_pos2)
        } else {
            scramble_attack(s, attack_pos2)
        }
    }

    if (tot < 100) {
        d_member = tot / 3
        if (i < d_member / 4 * 1) {
            scramble_attack(s, attack_pos2)
        } else if (i < d_member / 4 * 2) {
            scramble_attack(s, attack_pos2)
        } else if (i < d_member / 4 * 3) {
            defend(s, base)
        } else if (i < d_member) {
            scramble_support(s, support_pos1)
        } else {
            farming(s, base_star, base, Math.floor(i / 2))
        }
        continue
    }

    d_member = Math.min(tot / 4, 50)
    if (i < d_member) {
        if (i < d_member / 4 * 1) {
            // scramble_support(s, support_pos1)
            defend(s, star_zxq)
        } else if (i < d_member / 4 * 2) {
            scramble_support(s, support_pos1)
        } else if (i < d_member / 4 * 3) {
            // scramble_attack(s, attack_pos1)
            defend(s, star_zxq)
        } else {
            scramble_attack(s, attack_pos2)
        }
    } else if (tot < 80) {
        farming(s, base_star, base, Math.floor(i / 3))
        continue
    } else {
        res = tot - d_member
        if (i < 70) {
            farming(s, base_star, base, Math.floor(i / 3))
        } else if (i < d_member + res / 2) {
            defend(s, star_p89)
        } else {
            defend(s, star_zxq)
            farming(s, star_zxq, star_zxq)
        }
    }
}
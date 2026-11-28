/* DESIGN: LIVLOCH's debrief explains the simulation with a shared visual vocabulary.
   This file is presentation data only: it never reads the DOM or changes W.
   Keep the rules aligned with core.js and sim.js, including mode differences. */
(function (G) {
  'use strict';

  var LL = G.LL = G.LL || {};
  var groups = [
    { id: 'front', short: 'Front', title: 'Move the front', icon: 'path' },
    { id: 'fight', short: 'Fight', title: 'Stay in the fight', icon: 'sword' },
    { id: 'light', short: 'Light', title: 'Protect the light', icon: 'lamp' },
    { id: 'loch', short: 'Loch', title: 'Read the loch', icon: 'waves' },
    { id: 'rain', short: 'Rain', title: 'Answer the rain', icon: 'cloud-rain' }
  ];

  // Also used by the existing Dreamwalk narration. These rules stand on their
  // own; get() adds the diagram and resolves the current mode's quantities.
  var systems = {
    wave: ['The livelock', 'Waves return every 24 seconds and contest the same front. Hush numbers vary with difficulty, red rain and Mercy.'],
    soul: ['Souls and orbs', 'Half a trooper kill\'s reward is banked; half floats as an orb. Shoot your side\'s orb to secure it, or an enemy orb to deny it and take part of its value.'],
    zip: ['Threads', 'Ride your own thread toward the front. Its reach extends when enemy structures fall and retreats when yours fall.'],
    thief: ['The small ones', 'The Hush has no heroes. Its thieves steal heroes\' souls or carry away the light from houses.'],
    snuff: ['A stolen light', 'Catch a light-carrying thief before its gate to restore the light. If it escapes, the house loses 25% of its maximum health and stays dark for two minutes in Match; in Ever Fallen it needs a recovered light.'],
    lastbreath: ['Last breath', 'Once per life, a hit that leaves a hero alive at 30% health or less triggers a brief shield and pushes nearby enemy troopers away. It does not prevent a lethal hit.'],
    nessup: ['The Ness', 'The Ness first surfaces in the loch three minutes into the run.'],
    nesschomp: ['The chomp', 'The Ness bites what comes within reach. It rears first and marks the spot; a jump over the bite, a dash out of the ring or a ride on a thread avoids it. A caught hero is held for about a second, then thrown clear.'],
    flood: ['The flood', 'Once each rising the loch floods the valley for about eighteen seconds and the Ness swims out among the threads. Heroes wade slowly, move faster through the air, and the threads stay dry.'],
    nessdown: ['The Greatness', 'A hero\'s final hit on the Ness gives their whole side 90 seconds of stronger attacks and 350 base souls per hero.'],
    redwarn: ['A mood', 'Thirty seconds before red rain, the valley gives a line that matches one View. Choose the right View before the rain; there are three tries.'],
    moodmiss: ['Wrong view', 'A mismatched View uses one try. Dreamwalk deliberately tries one wrong View before showing the answer.'],
    moodsolved: ['The answer', 'The matching View makes the next rain thin: no extra hollows or wave troopers, and a smaller thief surge. Each Reign hero also receives 80 base souls.'],
    red: ['Red rain', 'Red rain strengthens the Hush for one minute. It returns every five minutes in Match, or every two and a half minutes in Ever Fallen.'],
    rainwake: ['Rainwake', 'While the Rainwake View is worn and red rain is active, Reign heroes receive 1.5 times the normal soul value.'],
    memory: ['Memory', 'Memory makes Reign house blackouts pass twice as fast and recovered lights last twice as long in Ever Fallen. Reign soul rewards are halved while this View is worn.'],
    fruit: ['Fruit', 'Lemons speed movement and stamina recovery; rose hips heal and clear slowing and damage over time; Verde Limón strengthens gun and ability hits. The fruit grows back.'],
    bigfruit: ['Big fruit', 'Each rare fruit can be seen and collected only through its matching View. Its benefit reaches all living heroes on the collector\'s side.'],
    fold: ['The fold', 'After a crease\'s guard falls, activate the cleared crease to send your side\'s troopers onto the neighboring thread for 45 seconds. The thread they left is shut to the Hush until the crease lets go: small troopers that walk into it crumple, and a hollow is pinned there.'],
    // 0.28 play: three rules found by riding, by going home, and by watching the clock between rains
    arrive: ['Arrival', 'Let go of a thread after a long ride toward the front and the pull runs on: Hush troopers around the landing and along the thread ahead are struck and slowed. A ride home or a short hop lands quietly.'],
    ember: ['A light from home', 'A hero who waits a moment in the fountain, is mended there by a good part of its health, or catches a small one, carries a light. On foot beside one of its side\'s houses the light goes in: the house is lit again, mended and kept for a while, firing faster, taking less harm and never slack. One light at a time, and it goes out if its carrier falls. Match and First Rain only.'],
    slack: ['The slack thread', 'Before each red rain and again as it ends, the most worn thread goes slack. Houses of both sides on it stop firing and lose their protection, the thread carries a rider to the far side\'s open house, and on Even and Cruel the Hush sends a hollow down it. The first house to fall pulls it tight. Long match only.'],
    echo: ['Echo', 'Echo replays your recent movement and shots from the same places, with shots at 70% damage. It reaches six seconds back normally, or ten seconds in Memory.'],
    mercy: ['Mercy', 'When Reign has at least two more destroyed structures than Hush, Hush sends one fewer trooper per thread per wave and its thief spawn interval becomes 1.6 times longer.'],
    fishing: ['Fishing', 'AI heroes sometimes regroup at the Ness. A whole side can leave its threads unguarded while it goes to the loch.'],
    fray: ['The fray', 'After fifteen minutes, vulnerable structures take 1.4 times normal damage and no longer reduce damage for missing attacking troopers. Progression locks still apply.'],
    gutter: ['The gutter', 'After twenty minutes in Match, both patrons lose 25 health per second until one falls. This timer does not run in Ever Fallen.'],
    relit: ['A light recovered', 'Ever Fallen: a thief defeated by Reign relights the nearest living dark Reign house, excluding the patron, for 80 seconds. Memory doubles how long that recovered light lasts.'],
    structdown: ['A house falls', 'Bring attacking troopers close to a vulnerable structure for full damage. Before the fray, a structure without nearby attacking troopers takes only 30% damage; progression locks still apply.']
  };

  function step(icon, label, detail, tone) {
    var out = { icon: icon, label: label, tone: tone || 'gold' };
    if (detail) out.detail = detail;
    return out;
  }
  function diagram(kind, reading, steps, condition, branches) {
    var out = { kind: kind, reading: reading, steps: steps };
    if (condition) out.condition = condition;
    if (branches) out.branches = branches;
    return out;
  }
  function card(group, summary, icon, text, visual, rule) {
    var out = { group: group, summary: summary, badge: { icon: icon, text: text }, diagram: visual };
    if (rule) out.rule = rule;
    return out;
  }
  function positive(value, fallback) {
    return typeof value === 'number' && isFinite(value) && value > 0 ? value : fallback;
  }
  function duration(seconds) {
    var minutes = Math.floor(seconds / 60), rest = seconds % 60;
    return minutes ? minutes + ' min' + (rest ? ' ' + rest + ' s' : '') : seconds + ' s';
  }

  function get(id, world) {
    if (!Object.prototype.hasOwnProperty.call(systems, id)) return null;
    var W = world || {}, C = LL.C || {};
    var fallen = !!W.fallen || W.mode === 'fallen', memory = W.lens === 'memory';
    var foldT = positive(C.FOLD_T, 45), greatT = positive(C.GREAT_T, 90);
    var litT = positive(C.LIT_T, 80), redT = positive(C.RED_T, 60);
    var redEvery = positive(W.redEvery, fallen ? positive(C.FALLEN_RED_EVERY, 150) : positive(C.RED_EVERY, 300));
    var warnT = positive(C.RED_WARN, 30), guesses = positive(C.MOOD_GUESSES, 3);
    var echoT = memory ? positive(C.ECHO_MEM, 10) : positive(C.ECHO_T, 6);
    var echoDmg = Math.round(positive(C.ECHO_DMG, 0.7) * 100);
    var o;

    switch (id) {
      case 'wave':
        o = card('front', 'The front fills again every 24 seconds.', 'repeat', 'Every 24 s',
          diagram('chain', 'Opposing waves meet at the front, then new waves return every 24 seconds. Numbers can change with difficulty, rain and Mercy.', [
            step('users-three', 'Opposing waves', 'Reign and Hush'),
            step('sword', 'Meet at the front', 'Contest the same threads', 'hush'),
            step('repeat', 'Waves return', 'Every 24 s')
          ]));
        break;
      case 'soul':
        o = card('fight', 'Half now. Shoot the floating half to secure or deny it.', 'circle-half', '50% + 50%',
          diagram('branches', 'A trooper kill banks half the reward and leaves half in an orb. Shoot your side\'s orb to secure that half. Shoot an enemy orb to deny it and gain 30% of its value.', [
            step('skull', 'Trooper falls', 'Kill reward'),
            step('circle-half', 'Half now · half orb', '50% banked; 50% floats')
          ], null, [
            { label: 'Your side\'s orb', steps: [step('crosshair', 'Shoot to secure', '', 'mint'), step('circle-half', 'Keep the other half', '', 'mint')] },
            { label: 'Enemy orb', steps: [step('crosshair', 'Shoot to deny', '', 'hush'), step('shield-slash', 'Deny their orb', 'Gain 30% of the orb', 'hush')] }
          ]));
        break;
      case 'zip':
        o = card('front', 'Your thread carries you toward the front.', 'path', 'Reach follows structures',
          diagram('chain', 'Board your own thread and ride toward the front. Its reach extends when enemy structures fall and retreats when your structures fall.', [
            step('path', 'Board your thread'),
            step('person-simple-run', 'Ride to the front'),
            step('house', 'Take their structures', 'Your thread reaches farther')
          ]));
        break;
      case 'thief':
        o = card('light', 'Hush thieves take souls or house light.', 'ghost', 'Hush has no heroes',
          diagram('parallel', 'Hush has no heroes. Its thieves target either heroes\' souls or the light in houses.', [
            step('circle-half', 'Steal souls', 'From a hero', 'hush'),
            step('lamp', 'Steal light', 'From a house', 'hush')
          ], 'Two things a Hush thief can take'));
        break;
      case 'snuff':
        var blackout = memory ? '1 min in Memory' : '2 min';
        var darkResult = fallen ? 'Dark until recovered' : 'Dark for ' + blackout;
        o = card('light', 'Catch the thief before its gate to bring the light back.', 'lamp', fallen ? 'Ever Fallen' : 'Match',
          diagram('branches', 'A thief carries away a house\'s light. Catch it before the gate to restore the light. If it escapes, the house loses 25% of its maximum health and is ' + (fallen ? 'dark until a light is recovered.' : 'dark for ' + (memory ? 'one minute with Memory active.' : 'two minutes.')), [
            step('ghost', 'Thief takes light', 'Runs toward its gate', 'hush')
          ], null, [
            { label: 'Catch before gate', steps: [step('crosshair', 'Defeat the thief'), step('lamp', 'Light returns', '', 'mint')] },
            { label: 'Thief escapes', steps: [step('house', '−25% max HP', 'This loss leaves at least 1 HP', 'hush'), step('lamp', darkResult, '', 'dim')] }
          ]), 'Catch the light-carrying thief before its gate to restore the house. If it escapes, the house loses 25% of its maximum health, without falling below 1 HP from that penalty. ' + (fallen ? 'In Ever Fallen it stays dark until a light is recovered.' : 'Its blackout then lasts 120 seconds, with the timer running twice as fast while Memory is worn.'));
        break;
      case 'lastbreath':
        o = card('fight', 'Survive a hit at low health to gain a brief shield.', 'heartbeat', 'Once per life',
          diagram('chain', 'Once per life, a hit that leaves the hero alive at 30% health or less raises their shield to at least 170 for 3.5 seconds and pushes and slows nearby enemy troopers. A lethal hit does not trigger it.', [
            step('heartbeat', 'Survive the hit', 'At 30% HP or less'),
            step('shield', '170 shield', 'For 3.5 s', 'mint'),
            step('users-three', 'Push troops away', 'Nearby enemies also slow', 'hush')
          ]));
        break;
      case 'nessup':
        o = card('loch', 'Something large surfaces three minutes in.', 'clock', 'First rise · 3:00',
          diagram('chain', 'At three minutes into the run, the Ness first surfaces in the loch.', [
            step('clock', '3:00 into the run'),
            step('waves', 'The loch stirs', '', 'mint'),
            step('fish', 'The Ness surfaces', '', 'mint')
          ]));
        break;
      case 'nesschomp':
        var NC = (LL.sim && LL.sim.NESS) || {}, tellT = positive(NC.TELL, 0.9), holdT = positive(NC.HOLD, 1.1), biteD = positive(NC.BITE, 120), openT = positive(NC.OPEN, 1.6), reachD = positive(NC.REACH, 14);
        o = card('loch', 'The Ness rears, marks a spot, then bites it.', 'warning-circle', tellT + ' s warning',
          diagram('branches', 'The Ness bites anything within ' + reachD + ' metres of the middle of the loch, or close to its body in a flood. It rears for ' + tellT + ' seconds and marks the spot on the ground. Be off the spot, in the air above it or riding a thread when the jaws close.', [
            step('warning-circle', 'It rears', tellT + ' s · a ring marks the spot', 'mint'),
            step('fish', 'The jaws close', 'On the marked spot', 'hush')
          ], null, [
            { label: 'Caught on the spot', steps: [step('heartbeat', '−' + biteD + ' health', 'Plus 8 for each minute played', 'hush'), step('timer', 'Held ' + holdT + ' s', 'Mash jump or dash to slip out', 'hush'), step('person-simple-run', 'Thrown clear', '', 'dim')] },
            { label: 'Jumped, dashed or riding', steps: [step('check', 'The bite misses', '', 'mint'), step('crosshair', 'Its head lies open', openT + ' s · takes 1.5× damage', 'mint')] }
          ]), 'The Ness bites anything within ' + reachD + ' metres of the middle of the loch, or close to its body while it swims a flood. It rears for ' + tellT + ' seconds first; the marked spot follows its prey until just before the bite. A hero on the spot and near the ground takes ' + biteD + ' damage plus 8 for each minute played, is held for ' + holdT + ' seconds (each press of jump or dash shortens it, and so does a friend hurting the Ness), then is thrown clear. Small troopers on the spot are eaten. A miss leaves its head on the ground for ' + openT + ' seconds, taking 1.5 times normal damage.');
        break;
      case 'flood':
        var NF = (LL.sim && LL.sim.NESS) || {}, swellT = positive(NF.SWELL, 3.5), highT = positive(NF.HIGH, 12), firstT = positive(NF.FLOOD_FIRST, 70), everyT = positive(NF.FLOOD_EVERY, 240), hpF = Math.round(positive(NF.FLOOD_HP, 0.6) * 100), wadeP = Math.round(positive(NF.WADE, 0.65) * 100), airP = Math.round(positive(NF.AIR, 1.25) * 100);
        o = card('loch', 'The loch floods the valley and the Ness swims out.', 'waves', 'About ' + Math.round(highT + 6) + ' s of water',
          diagram('chain', 'Once each rising, when the Ness falls under ' + hpF + '% health or ' + duration(firstT) + ' after it surfaces, the loch floods the whole valley. The water stands for ' + highT + ' seconds, then runs back. While it is up the Ness leaves the loch and hunts in the water.', [
            step('warning-circle', 'The loch stands up', swellT + ' s of warning', 'mint'),
            step('waves', 'Water over the valley', 'Wade at ' + wadeP + '% · air at ' + airP + '%', 'hush'),
            step('path', 'Threads stay dry', 'Ride one: full speed, out of the jaws', 'mint'),
            step('fish', 'The Ness returns', 'When the water runs back', 'dim')
          ], 'Under ' + hpF + '% health, or ' + duration(firstT) + ' after it surfaces'), 'Once each rising the loch floods the valley: when the Ness falls under ' + hpF + '% of its health, or ' + duration(firstT) + ' after it surfaces if left alone, and again ' + duration(everyT) + ' after the last flood while it lives. A flood by the clock does not start during red rain or within 25 seconds of it. After ' + swellT + ' seconds of warning the water runs out from the loch, stands for ' + highT + ' seconds and runs back. In the water heroes on the ground move at ' + wadeP + '% speed and are carried along the nearest thread; in the air they move at ' + airP + '%; a dash carries farther; small troopers float slowly and drift. Riding a thread is unaffected and out of reach of the bite. The Ness swims out to hunt and returns to the loch as the water leaves. Defeating it drains the flood at once.');
        break;
      case 'nessdown':
        o = card('loch', 'The hero who lands the last hit strengthens their whole side.', 'timer', duration(greatT),
          diagram('chain', 'A hero\'s final hit defeats the Ness and grants the Greatness to their whole side for ' + duration(greatT) + ', plus 350 base souls per hero.', [
            step('crosshair', 'Land the last hit', 'A hero defeats the Ness'),
            step('users-three', 'Whole side benefits'),
            step('sword', 'Stronger attacks', duration(greatT))
          ]), 'A hero\'s final hit on the Ness grants their side the Greatness for ' + duration(greatT) + ' and 350 base souls per hero. Guns, abilities and troopers hit harder; the effects use different bonuses.');
        break;
      case 'redwarn':
        o = card('rain', 'Read the valley\'s line and choose the matching View.', 'timer', duration(warnT) + ' before rain',
          diagram('chain', duration(warnT) + ' before red rain, the valley gives a line. Choose the View that answers it before rain begins; there are ' + guesses + ' tries.', [
            step('clock', 'Rain approaches', duration(warnT) + ' away', 'rain'),
            step('dots-three', 'Read the valley\'s line'),
            step('eye', 'Choose its View', guesses + ' tries', 'mint')
          ]), duration(warnT) + ' before red rain, the valley gives one line that matches one View. Choose it before rain begins; you have ' + guesses + ' tries.');
        break;
      case 'moodmiss':
        o = card('rain', 'A mismatched View uses one of your tries.', 'warning-circle', 'One try spent',
          diagram('chain', 'Choose a View that does not match the valley\'s line and one try is spent. Dreamwalk intentionally shows one wrong answer before the matching View.', [
            step('eye', 'View does not match', '', 'dim'),
            step('warning-circle', 'One try spent', 'Try another View', 'rain')
          ], 'Dreamwalk demonstrates one miss'));
        break;
      case 'moodsolved':
        o = card('rain', 'The matching View makes the coming rain thinner.', 'check', 'The mood answered',
          diagram('chain', 'Choose the View that matches the valley\'s line. The coming rain has no extra hollows or extra wave troopers, and its thief surge is smaller. Reign heroes gain 80 base souls each.', [
            step('eye', 'Matching View', '', 'mint'),
            step('check', 'Mood answered', '', 'mint'),
            step('cloud-rain', 'Thinner rain', 'No extra hollows; fewer thieves', 'rain')
          ]));
        break;
      case 'red':
        o = card('rain', 'The Hush surges for ' + duration(redT) + ' at a time.', 'repeat', 'Every ' + duration(redEvery),
          diagram('chain', (fallen ? 'In Ever Fallen' : 'In Match') + ', red rain returns every ' + duration(redEvery) + ' and lasts ' + duration(redT) + '. Unanswered rain adds Hush pressure; answering the mood reduces the surge.', [
            step('repeat', 'Every ' + duration(redEvery), fallen ? 'Ever Fallen' : 'Match', 'rain'),
            step('cloud-rain', 'Red rain', duration(redT), 'rain'),
            step('ghost', 'Hush pressure rises', 'A solved mood reduces it', 'hush')
          ]), 'In this mode red rain returns every ' + duration(redEvery) + ' and lasts ' + duration(redT) + '. Answering the mood removes the extra troops and hollows and reduces the thief surge. Thieves still arrive faster during the thin rain.');
        break;
      case 'rainwake':
        o = card('rain', 'Wear Rainwake during red rain for more soul value.', 'circle-half', 'Souls ×1.5',
          diagram('chain', 'While red rain is active, wearing the Rainwake View makes Reign soul rewards worth 1.5 times their normal value.', [
            step('eye', 'Wear Rainwake', 'During red rain', 'rain'),
            step('circle-half', 'Soul value ×1.5', '', 'gold')
          ], 'Both the View and red rain must be active'));
        break;
      case 'memory':
        o = card('light', 'Shorter blackouts and longer recovered light cost soul value.', 'eye', 'Memory View',
          diagram('parallel', 'While Memory is worn, Reign blackout timers run twice as fast, recovered lights last twice as long in Ever Fallen, and Reign soul rewards are halved.', [
            step('hourglass', 'Blackout time ×½', 'Timer runs twice as fast', 'mint'),
            step('lamp', 'Recovered light ×2', 'Ever Fallen only', fallen ? 'mint' : 'dim'),
            step('circle-half', 'Soul value ×½', 'While Memory is worn', 'gold')
          ], 'Three simultaneous effects while wearing Memory'));
        break;
      case 'fruit':
        var fruit = C.FRUIT_INFO || {};
        var lemonT = positive(fruit.lemon && fruit.lemon.t, 9);
        var hipsT = positive(fruit.hips && fruit.hips.t, 5);
        var limeT = positive(fruit.lime && fruit.lime.t, 9);
        o = card('fight', 'Choose fruit for speed, healing or stronger hits.', 'leaf', 'Fruit grows back',
          diagram('parallel', 'Lemon speeds movement and stamina recovery for ' + duration(lemonT) + '. Rose hips clear slowing and damage over time, then heal for ' + duration(hipsT) + '. Verde Limón strengthens gun and ability hits for ' + duration(limeT) + '. The plants regrow.', [
            step('orange-slice', 'Lemon', 'Move faster · ' + duration(lemonT), 'gold'),
            step('heart', 'Rose hips', 'Heal · ' + duration(hipsT), 'rain'),
            step('leaf', 'Verde Limón', 'Hit harder · ' + duration(limeT), 'mint')
          ], 'Eat ripe fruit by moving close to it'));
        break;
      case 'bigfruit':
        o = card('loch', 'A matching View reveals rare fruit for the whole side.', 'users-three', 'All living allied heroes',
          diagram('parallel', 'Hypermetapunk reveals Big Verde Limón, Origami reveals Big Lemon, and Knight Night reveals Big Rose hips. Each can only be collected in its matching View and benefits all living heroes on the collector\'s side.', [
            step('eye', 'Hypermetapunk', 'Big Verde Limón', 'mint'),
            step('eye', 'Origami View', 'Big Lemon', 'gold'),
            step('eye', 'Knight Night', 'Big Rose hips', 'rain')
          ], 'Each ripe rare fruit needs its own View'));
        break;
      case 'fold':
        o = card('front', 'Activate a cleared crease to redirect your troopers.', 'timer', duration(foldT),
          diagram('chain', 'After the crease\'s guard dies, activate the crease nearby. Your side\'s troopers cross onto the neighboring thread for ' + duration(foldT) + '. The thread they left is shut to the Hush for as long: small troopers that walk into the crease crumple, and a hollow is pinned there until it lets go.', [
            step('skull', 'Crease guard falls', '', 'hush'),
            step('map-trifold', 'Activate the crease', 'Move close, then fold'),
            step('git-branch', 'Troopers cross threads', duration(foldT)),
            step('lock-open', 'Their thread is shut', 'Small ones crumple · a hollow is pinned', 'hush')
          ]), 'After a crease\'s guard falls, activate that crease nearby. It redirects your side\'s troopers from one neighboring thread onto the other for ' + duration(foldT) + '. Until it lets go, the thread they left is shut to the Hush: small troopers that walk into the crease crumple and are gone, and a hollow is pinned there and pressed, losing health each second. What was already past the crease keeps coming.');
        break;
      // 0.28 play
      case 'arrive':
        var AR = C.ARRIVE || {}, arMin = positive(AR.min, 45), arReach = positive(AR.reach, 24), arSlow = Math.round(positive(AR.slow, 0.5) * 100);
        o = card('front', 'A long ride toward the front lands hard.', 'path', arMin + ' m or more',
          diagram('chain', 'Ride a thread at least ' + arMin + ' metres toward the front, then let go or reach its end. Hush troopers around the landing and up to ' + arReach + ' metres ahead on that thread are struck and slowed by ' + arSlow + '%. A hollow takes a quarter of the blow.', [
            step('path', 'Ride ' + arMin + ' m', 'Toward the front'),
            step('arrow-down', 'Let go', 'Or reach the end'),
            step('users-three', 'The Hush ahead staggers', 'Struck · slowed ' + arSlow + '%', 'hush')
          ], 'A ride home or a short hop lands quietly'), 'Let go of a thread after riding at least ' + arMin + ' metres toward the front, or ride it to its end. Hush troopers within ' + positive(AR.r, 8) + ' metres of the landing, or up to ' + arReach + ' metres ahead on that thread, take a blow and are slowed by ' + arSlow + '% for ' + positive(AR.slowT, 2.5) + ' seconds. A hollow takes a quarter of the blow.');
        break;
      case 'ember':
        var EM = C.EMBER || {}, emNeed = Math.round(positive(EM.need, 0.4) * 100), emHeal = Math.round(positive(EM.heal, 0.2) * 100), emWait = positive(EM.wait, 3), emKeep = positive(EM.bright, 30), emGuard = Math.round((1 - positive(EM.guard, 1)) * 100);
        o = card('light', 'Home, or a caught small one, gives you one light. The house that takes it is kept.', 'flame', 'One light · kept ' + emKeep + ' s',
          diagram('chain', 'Wait ' + emWait + ' seconds in the fountain, let it mend ' + emNeed + '% of your health in one visit, or catch a small one, and you carry a light. On foot beside a house of your side the light goes in: lit again, +' + emHeal + '% health, and kept for ' + emKeep + ' seconds. A rider on a thread keeps the light as it passes, so you choose the house.', [
            step('heart', 'Home, or a small one caught', emWait + ' s waiting · ' + emNeed + '% mended', 'rain'),
            step('flame', 'Carry one light', 'A rider keeps it · lost if you fall'),
            step('house', 'Walk it to a house', 'Kept ' + emKeep + ' s: fires faster, ' + emGuard + '% less harm, never slack', 'mint')
          ], fallen ? 'Not in Ever Fallen' : 'One light at a time'), 'A hero who stands ' + emWait + ' seconds in its fountain, whom the fountain has mended by ' + emNeed + '% of its health in one visit, or who catches a small one, carries a light. On foot within ' + positive(EM.r, 9) + ' metres of one of its side\'s houses, the light goes in: the house is lit again at once, gains ' + emHeal + '% of its health and is kept for ' + emKeep + ' seconds, firing ' + positive(EM.fire, 2) + ' times as fast, taking ' + emGuard + '% less harm, never slack even on a slack thread, and safe from small ones. One light at a time; a hero riding a thread keeps it; it goes out if its carrier falls. Ever Fallen has no such light.');
        break;
      case 'slack':
        var SL = C.SLACK || {}, slT = positive(SL.t, 50), slMul = positive(SL.mul, 1.5), slHollows = ((C.DIFF || [])[W.diff == null ? 1 : W.diff] || {}).slackHollows;
        o = card('front', 'Between rains one thread goes slack, and its houses stand open.', 'timer', duration(slT),
          diagram('parallel', 'Before each red rain and as it ends, one thread goes slack for up to ' + duration(slT) + ', said ' + positive(SL.warn, 20) + ' seconds ahead. Houses of both sides on it stop firing, lose their protection and take ' + slMul + ' times the harm.' + (slHollows ? ' The Hush sends a hollow down it' + (positive(SL.lead, 0) ? ', setting out ' + positive(SL.lead, 0) + ' seconds before' : '') + '.' : '') + ' The thread carries a rider to the far house, and the first house to fall on it pulls it tight.', [
            step('shield-slash', 'No protection', 'Harm ×' + slMul + ', troopers near or not', 'rain'),
            step('lamp', 'No house fires', 'Theirs and yours', 'dim'),
            step('ghost', slHollows ? 'A hollow comes down it' : 'No extra hollow', slHollows ? 'Even and Cruel' : 'Gentle', 'hush')
          ], 'Long match only · never a patron · not after 15:00'), 'First at ' + duration(positive(SL.first, 150)) + ', then ' + positive(SL.pre, 90) + ' seconds before each red rain and again as each rain ends, one thread goes slack for ' + duration(slT) + ', announced ' + positive(SL.warn, 20) + ' seconds ahead. It is the most worn thread: the one whose houses, both sides together, have lost the most. The houses of both sides on it, never a patron, stop firing and take ' + slMul + ' times normal damage whether or not attacking troopers are near. On Even and Cruel the Hush sends an extra hollow down it. While it is slack the thread carries a rider all the way to the far side\'s open house. The first house to fall on it pulls it tight at once, and if that was a Hush house the extra hollow crumples. It does not happen in First Rain or Ever Fallen, or after the threads fray at 15:00.');
        break;
      case 'echo':
        o = card('fight', 'Your recent path and shots replay beside you.', 'rewind', 'Up to ' + duration(echoT),
          diagram('chain', 'Activate Echo to replay up to the last ' + duration(echoT) + ' of your recorded movement and shots from the same places, with shots at ' + echoDmg + '% damage.', [
            step('path', 'Your recent path', 'Movement and shots'),
            step('rewind', 'Replay ' + duration(echoT), memory ? 'Memory View' : 'Normal View'),
            step('person-simple-run', 'A second self', echoDmg + '% shot damage', 'mint')
          ]), 'Echo replays recorded movement and shots from the same places, reaching up to ' + duration(echoT) + ' into your recent past in the current View. Its shots use ' + echoDmg + '% damage.');
        break;
      case 'mercy':
        o = card('front', 'The Hush eases off when Reign is two structures behind.', 'house', 'At least 2 behind',
          diagram('parallel', 'When Reign has at least two more destroyed structures than Hush, Hush waves contain one fewer trooper per thread and the thief spawn interval is multiplied by 1.6.', [
            step('users-three', 'Smaller Hush waves', 'One fewer per thread', 'hush'),
            step('clock', 'Thieves arrive less often', 'Spawn interval ×1.6', 'hush')
          ], 'Reign has lost at least 2 more structures than Hush'));
        break;
      case 'fishing':
        o = card('loch', 'A trip to the Ness can leave threads unguarded.', 'fish', 'A temporary regroup',
          diagram('chain', 'AI heroes sometimes regroup at the Ness in the loch. When a whole side goes, its threads can be left unguarded.', [
            step('users-three', 'Heroes regroup'),
            step('fish', 'Go to the Ness', 'In the loch', 'mint'),
            step('path', 'Threads unguarded', 'Nobody holds the front', 'dim')
          ]));
        break;
      case 'fray':
        o = card('front', 'After fifteen minutes, structure protection weakens.', 'clock', 'After 15:00',
          diagram('chain', 'After fifteen minutes, vulnerable structures stop reducing damage for missing attacking troopers and instead take 1.4 times normal damage. Progression locks still apply.', [
            step('clock', '15:00 passes'),
            step('shield-slash', 'Damage reduction ends', 'Missing troops no longer reduce hits', 'hush'),
            step('house', 'Structure damage ×1.4', 'Vulnerable structures only', 'rain')
          ]));
        break;
      case 'gutter':
        o = card('front', 'Both patrons begin losing health after twenty minutes.', 'clock', 'After 20:00 · Match',
          diagram('chain', 'In Match, after twenty minutes both patrons lose 25 health per second until one falls. Ever Fallen does not use this timer.', [
            step('clock', '20:00 passes'),
            step('flame', 'Both patrons burn', '', 'rain'),
            step('heartbeat', '−25 HP each second', 'Until one patron falls', 'rain')
          ], 'Match only'));
        break;
      case 'relit':
        var heldT = litT * (memory ? 2 : 1);
        o = card('light', 'Defeat a thief to relight the nearest dark house.', 'timer', duration(heldT) + (memory ? ' · Memory' : ''),
          diagram('chain', 'In Ever Fallen, a thief defeated by Reign relights the nearest living dark Reign house other than the patron. That light lasts ' + duration(litT) + ', doubled while Memory is worn.', [
            step('crosshair', 'Defeat a thief', 'Reign claims the light'),
            step('house', 'Nearest dark house', 'A living Reign house', 'dim'),
            step('lamp', 'Light recovered', duration(heldT) + (memory ? ' in Memory' : ''), 'mint')
          ], 'Ever Fallen only'), 'In Ever Fallen, a thief defeated by Reign relights the nearest living dark Reign house other than the patron for ' + duration(litT) + '. Its light timer runs at half speed while Memory is worn, so a full light lasts ' + duration(litT * 2) + ' in Memory.');
        break;
      case 'structdown':
        o = card('front', 'Bring troopers close to deal full structure damage.', 'house', 'Troops enable full damage',
          diagram('chain', 'Before the fray, a vulnerable structure takes only 30% damage without nearby attacking troopers. Bring those troopers close to deal full damage. Progression locks still apply.', [
            step('shield-slash', 'No nearby troops', 'Only 30% damage', 'dim'),
            step('users-three', 'Bring your troopers', 'Close to the structure'),
            step('house', 'Full damage', 'Progression locks still apply', 'rain')
          ], 'Before 15:00 · vulnerable structures only'));
        break;
    }

    o.id = id;
    o.title = systems[id][0];
    if (!o.rule) o.rule = systems[id][1];
    return o;
  }

  LL.debriefData = { groups: groups, systems: systems, get: get };
})(window);

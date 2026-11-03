'use strict';

const battle = require('./battle');
const { teamPower } = require('./friends');
const tower = require('./tower');
const { t } = require('./i18n');
const render = require('./render');

const KINDS = ['catches', 'power', 'tower'];

/** The numbers behind a brag, so a UI can show them next to the text. */
function stats(dex) {
  const caught = Object.values(dex.creatures || {}).filter((c) => c.captures > 0);
  const team = battle.topTeam(dex.trophies || [], dex.creatures || null, battle.TEAM_SIZE, dex.team || []);
  const best = (dex.trophies || []).reduce((b, tr) => (!b || tr.power > b.power ? tr : b), null);
  return {
    kinds: caught.length,
    total: caught.reduce((n, c) => n + c.captures, 0),
    shiny: caught.reduce((n, c) => n + (c.shinies || 0), 0),
    best: best ? `${render.shownName(dex.creatures[best.id] || best)} (${best.power})` : '-',
    power: teamPower(team),
    team: team.map((m) => m.name).join(', ') || '-',
    floor: (dex.tower && dex.tower.cleared) || 0,
    floors: tower.FLOORS,
  };
}

/** A short, pasteable boast about what the player has caught, how strong their team is, or how far up the Tower they got. */
function text(dex, kind) {
  const s = stats(dex);
  const k = KINDS.includes(kind) ? kind : 'catches';
  return `${t(`brag.${k}`, s)}\n${t('brag.footer')}`;
}

module.exports = { KINDS, stats, text };

'use strict';

/**
 * Fifty species a new monster can be. Each one is a three-line face (no backslashes, so the art is safe to
 * paste anywhere); `e` is the pair of eyes the monster rolled. Names live in every locale's `species` list,
 * in this same order, so keep both in step (a test checks it).
 */
const SPECIES = [
  (e) => [`  .--.`, ` (${e})`, `  '--'`], // slime
  (e) => [` }(  ){`, ` (${e})`, ` /vvv|`], // moth
  (e) => [`  _^_`, ` (${e})`, ` /|_|_`], // beetle
  (e) => [`  .-.`, ` (${e})`, ` /wwv`], // ghost
  (e) => [` (${e})`, `/(_^_)|`, ` ^   ^`], // crab
  (e) => [` {o,o}`, ` |${e}|`, `  " "`], // owl
  (e) => [`   _@_`, `  (${e})`, ` ~~~~~~`], // snail
  (e) => [` .-"-.`, `(${e})`, ` /_w_|`], // frog
  (e) => [` ^|_|^`, ` (${e})`, `  vvv`], // bat
  (e) => [`  ><(((>`, ` (${e})`, `   ~~`], // fish
  (e) => [` .---.`, `( ${e} )`, ` /|/|/|`], // octopus
  (e) => [`  __`, ` (${e})~~`, ` ~~~~~`], // snake
  (e) => [` =(  )=`, ` (${e})`, ` /|||`], // spider
  (e) => [` /^-^|`, `( ${e} )`, ` (_m_)`], // cat
  (e) => [` ^---^`, `( ${e} )`, ` (_w_)`], // dog
  (e) => [` ||  ||`, ` (${e})`, ` (_.._)`], // rabbit
  (e) => [` .-""-.`, `(______)`, `  |${e}|`], // mushroom
  (e) => [`  _|_`, ` |${e}|`, `  |_|`], // cactus
  (e) => [` [====]`, ` [${e}]`, ` /_||_|`], // robot
  (e) => [` <^--^>`, `(  ${e}  )`, ` ~~vvv~`], // dragon
  (e) => [` ^_^_^`, `( ${e} )>`, `  vv~`], // fox
  (e) => [`  .-.`, ` (${e})`, ` /|=|`], // penguin
  (e) => [`  ____`, ` (${e})]`, ` /_||_|`], // turtle
  (e) => [` ° °`, ` (${e})`, ` =vvv=`], // bee
  (e) => [`  ___`, ` (${e})`, ` ~~~~~~~`], // worm
  (e) => [` .~~~.`, `( ${e} )`, ` ||||`], // jellyfish
  (e) => [` ><  ><`, ` (${e})`, ` /|__|`], // gremlin
  (e) => [` ^   ^`, ` (${e})`, ` >vvv<`], // imp
  (e) => [` [###]`, ` [${e}]`, ` [_||_]`], // golem
  (e) => [`  ~.~`, ` (${e})`, `  ~~~`], // wisp
  (e) => [` (o)  (o)`, `  (${e})`, `  ~~~~---`], // rat
  (e) => [`  >v<`, ` (${e})`, `  /|>`], // crow
  (e) => [`  .--.`, ` (${e})`, `  ~~~~~`], // seal
  (e) => [` .-^-.`, ` (${e})`, ` /|||`], // squid
  (e) => [`  ____`, `-(${e})-`, ` ~/_/_`], // lizard
  (e) => [`  .-.`, ` (${e})`, ` ^-^-^`], // mole
  (e) => [`  o`, ` (${e})`, ` /|||`], // ant
  (e) => [`  * *`, ` (${e})`, `  · ·`], // firefly
  (e) => [` .--.--.`, `(${e})`, ` '-----'`], // cloud
  (e) => [` .----.`, `/ ${e} |`, `'------'`], // rock
  (e) => [` +----+`, ` |${e}|`, ` +----+`], // cube
  (e) => [` ##  ##`, ` #${e}#`, ` ######`], // pixel
  (e) => [`   *`, ` -(${e})-`, `  '`], // comet
  (e) => [`  _|_`, ` /${e}|`, ` |___|`], // lantern
  (e) => [`  o-,`, ` (${e})`, `  |-'`], // key
  (e) => [` -[+]-`, ` (${e})`, ` -[+]-`], // gear
  (e) => [`  ___`, ` / ${e} |`, ` '---'`], // egg
  (e) => [` ,_,`, `(${e})>`, ` /|_`], // bird
  (e) => [` (o-o)`, `( ${e} )`, ` (m  m)`], // bear
  (e) => [` ^^^^^`, `(${e})>`, ` ' '`], // hedgehog
];

const COUNT = SPECIES.length;

/** The three art lines of species `i` wearing `eyes`. */
const draw = (i, eyes) => SPECIES[i % COUNT](eyes);

module.exports = { SPECIES, COUNT, draw };

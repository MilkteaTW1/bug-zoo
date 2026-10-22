'use strict';

// Language file. To add a language, run `npm run lang -- <code> <label>` and translate `messages` and `help`.
module.exports = {
  code: 'ko',
  label: "한국어",
  // Locale prefixes that select this language (the longest match wins), e.g. LANG=zh_TW.UTF-8 -> 'zh-tw'.
  detect: ['ko'],
  // Monster names are prefix + suffix, picked from the error's hash. The two lists may have any length.
  names: {
    // EN: ['Grim', 'Fluff', 'Snark', 'Wobble', 'Gloom', 'Zap', 'Murk', 'Pip', 'Crumb', 'Hex', 'Glitch', 'Nib']
    prefix: ['섬뜩', '보송', '까칠', '뒤뚱', '어둑', '찌릿', '컴컴', '삐약', '부스럭', '주술', '지직', '콕콕'],
    // EN: ['ling', 'bat', 'gnaw', 'moth', 'toad', 'wisp', 'beetle', 'imp', 'crawler', 'snail', 'sprite', 'mite']
    suffix: ['꼬마괴물', '박쥐', '쏠쥐', '나방', '두꺼비', '도깨비불', '풍뎅이', '도깨비', '꿈틀이', '달팽이', '요정', '진드기'],
  },
  /* EN help (original):
bugzoo - turn your errors into collectible monsters

Usage:
  bugzoo setup [--lang <code>] [--name N] [--auto on|off] [--ai on|off]
                              Language, player name, automatic capture, and
                              monsters for commands your AI assistant runs
                              (Claude Code)
  bugzoo lang [code]          Show the languages or switch: bugzoo lang zh-CN
  bugzoo run <command...>     Run a command. If it fails, a bug appears.
                              (Not needed once automatic capture is on.)
  bugzoo dex                  Your collection and bugs waiting to be caught
  bugzoo team                 Your strongest catches, with their evolution
  bugzoo achievements         Your achievements
  bugzoo battle [--card f.svg]
                              Show the ladder, your friends and a practice
                              opponent; type a number to fight. --card saves a
                              shareable result card
  bugzoo friend               List friends   (also: code | add <code|url|file|name>
                              | remove <name> | refresh)
  bugzoo ladder [dir]         Show the ladder
  bugzoo ladder join          Join the ladder in one step (needs a catch and a name)
  bugzoo scan                 Scan this project: size and most-depended-on modules
  bugzoo rank                 Show your score and title
  bugzoo share [--name N] [--out file]
                              Write a shareable score + team file (no error text)
  bugzoo leaderboard <dir|file...> [--out file.md]
                              Build a score leaderboard from shared files
  bugzoo hook <bash|zsh|fish|powershell>
                              Print a snippet that wraps common dev commands
  bugzoo export [file]        Export the bestiary as an SVG (default: bugzoo.svg)
  bugzoo help                 Show this help

Capture rules (re-running the same command in the same folder;
flags and numeric arguments are ignored when matching):
  clean run            caught
  same bug             still there
  some bugs gone       those are caught
  a new bug appears    escaped - the new bug becomes your target

Beating someone up to 3 ranks above you on the ladder takes their spot.
  */
  help: `bugzoo - 마주한 에러를 수집 가능한 버그로 바꿔 보세요

사용법:
  bugzoo setup [--lang <code>] [--name N] [--auto on|off] [--ai on|off]
                              언어, 플레이어 이름, 자동 포획, 그리고
                              AI 어시스턴트(클로드 코드)가 실행한
                              명령에서도 버그가 등장하게 설정
  bugzoo lang [code]          언어 목록 보기 또는 전환: bugzoo lang ko
  bugzoo run <command...>     명령어를 실행합니다. 실행에 실패하면 버그가 나타납니다.
                              (자동 포획 기능이 켜져 있으면 필요 없는 명령어입니다.)
  bugzoo dex                  내 컬렉션과 포획 가능한 버그
  bugzoo team                 내가 잡은 가장 강한 버그와 그 진화 단계
  bugzoo achievements         업적 확인
  bugzoo battle [--card f.svg]
                              래더, 친구, 연습 상대를 보여 줍니다.
                              번호를 입력하면 대전이 시작됩니다. --card는
                              공유용 결과 카드를 저장합니다
  bugzoo friend               친구 목록 보기   (그 외: code | add <code|url|file|name>
                              | remove <name> | refresh)
  bugzoo ladder [dir]         래더 보기
  bugzoo ladder join          래더 참가하기 (포획 기록과 이름 필요)
  bugzoo scan                 프로젝트 스캔하기: 규모와 가장 많이 import 되는 모듈
  bugzoo rank                 내 점수와 칭호 보기
  bugzoo share [--name N] [--out file]
                              점수와 팀을 담은 공유용 파일 만들기 (에러 내용은 포함하지 않음)
  bugzoo leaderboard <dir|file...> [--out file.md]
                              공유된 파일로 점수 리더보드 생성
  bugzoo hook <bash|zsh|fish|powershell>
                              자주 쓰는 개발 명령을 감싸는 스니펫 출력
  bugzoo export [file]        도감을 SVG로 내보내기 (기본값: bugzoo.svg)
  bugzoo help                 도움말 보기

포획 규칙 (같은 폴더에서 같은 명령을 다시 실행할 때,
플래그와 숫자 인자는 비교에서 무시합니다):
  깔끔하게 실행됨      포획
  같은 버그            아직 남아 있음
  일부 버그 사라짐     사라진 버그를 포획
  새 버그 등장         도주 - 새 버그가 새 목표가 됩니다

래더에서 나보다 최대 3단계 위의 상대를 이기면 그 자리를 차지합니다.
`,
  messages: {
    'fmt.creature': '{type} {name}',
    'fmt.power': '{label} (전투력 {power})', // EN: '{label} (power {power})'
    'rarity.common': '커먼', // EN: 'common'
    'rarity.uncommon': '언커먼', // EN: 'uncommon'
    'rarity.rare': '레어', // EN: 'rare'
    'rarity.legendary': '레전더리', // EN: 'legendary'

    'enc.appeared': '야생의 {type}이(가) 나타났다!', // EN: 'A wild {type} appeared!'
    'enc.new': '* 신규 *', // EN: '* NEW *'
    'enc.seen': '발견 x{n}', // EN: 'seen x{n}'
    'enc.power': '버그 크기: 전투력 {power}', // EN: 'bug size: power {power}'

    'out.caughtTag': '[포획 완료]', // EN: '[CAUGHT]'
    'out.escapedTag': '[도망쳤다]', // EN: '[ESCAPED]'
    'out.captured': '신난다! {names}을(를) 잡았다.', // EN: 'Clean run! You caught {names}.'
    'out.partial': '{names}을(를) 잡았습니다.', // EN: 'You caught {names}.'
    'out.partial2': '아직 잡히지 않음: {names}. 계속 고치고 다시 실행하세요.', // EN: 'Still at large: {names}. Keep fixing and run again.'
    'out.still': '아직 그대로 있습니다: {names}. 고친 뒤 다시 실행하세요.', // EN: "It's still there: {names}. Fix it and run again."
    'out.failed': '{names}이(가) 도망쳤습니다 - 버그 수정 중 새로운 문제가 생겼습니다.', // EN: '{names} slipped away - your fix introduced something new.'
    'out.failed2': '새 목표: {names}. 고친 뒤 다시 실행하면 버그를 잡을 수 있습니다.', // EN: 'New target(s): {names}. Fix and run again to catch.'
    'out.wild': '버그를 고치고 같은 명령을 다시 실행하면 버그를 잡을 수 있습니다.', // EN: 'Fix the bug and run the same command again to catch it.'

    'dex.empty': '버그 도감이 비어 있습니다. `bugzoo run <command>`를 실행해서 무언가 망가뜨려 보세요.', // EN: 'Your bestiary is empty. Run `bugzoo run <command>` and let something break.'
    'dex.title': 'Bug Zoo - 포획 {caught} / 발견 {seen}', // EN: 'Bug Zoo - {caught} caught / {seen} seen'
    'dex.caught': '포획 x{n}', // EN: 'caught x{n}'
    'dex.wild': '야생', // EN: 'wild'
    'dex.pending': '포획을 기다리는 버그 {n}마리.', // EN: '{n} bug(s) waiting to be caught.'

    'team.empty': '아직 트로피가 없습니다. 먼저 버그를 잡으세요: 고친 뒤 같은 명령을 다시 실행하면 됩니다.', // EN: 'No trophies yet. Catch a bug first: fix it and re-run the same command.'
    'team.title': '내가 잡은 가장 강한 버그 (상위 3마리가 대전에 출전)', // EN: 'Your strongest catches (top 3 fight in battles)'
    'team.power': '전투력', // EN: 'power'
    'factor.depth': '스택 깊이', // EN: 'depth'
    'factor.blast': '파급력', // EN: 'blast'
    'factor.size': '규모', // EN: 'size'
    'factor.rate': '실패율', // EN: 'rate'

    'battle.hit': '{att}의 공격! {def}에게 {dmg}만큼의 데미지를 가했다.', // EN: '{att} hits {def} for {dmg}'
    'battle.crit': ' (급소에 맞았다!)', // EN: ' (critical!)'
    'battle.faint': ' - {def}은(는) 쓰러졌다!', // EN: ' - {def} faints!'
    'battle.left': ' (남은 HP {hp})', // EN: ' ({hp} hp left)'
    'battle.you': '나', // EN: 'You'
    'battle.win': '승리! {winner}이(가) {loser}을(를) 이겼습니다.', // EN: 'You win! {winner} defeated {loser}.'
    'battle.lose': '패배. {winner}이(가) {loser}을(를) 이겼습니다.', // EN: 'You lose. {winner} defeated {loser}.'
    'battle.noTrophy': '아직 트로피가 없습니다. 먼저 버그를 잡으세요: 고친 뒤 같은 명령을 다시 실행해주세요.', // EN: 'You have no trophies yet. Catch a bug first: fix it, then re-run the same command.'

    'share.needName': '먼저 공개용 플레이어 이름을 정하세요: bugzoo share --name <name>', // EN: 'Pick a public player name first: bugzoo share --name <name>'
    'share.wrote': '{file} 작성 완료 ({name}, 점수 {score}, 팀 {n}마리).', // EN: 'Wrote {file} ({name}, score {score}, team of {n}).'

    'rank.title': '칭호: {title}', // EN: 'Title: {title}'
    'rank.score': '점수: {score}', // EN: 'Score: {score}'
    'rank.caught': '포획: 커먼 {c}, 언커먼 {u}, 레어 {r}, 레전더리 {l}  (반복 포획 +{rep}, 발견 {seen})', // EN: 'Caught: {c} common, {u} uncommon, {r} rare, {l} legendary  (+{rep} repeat catches, {seen} seen)'
    'rank.battles': '대전: {w}승 {l}패', // EN: 'Battles: {w} won, {l} lost'

    'scan.project': '프로젝트: {name}', // EN: 'Project: {name}'
    'scan.files': '파일: {files}   줄 수: {loc}', // EN: 'Files: {files}   Lines: {loc}'
    'scan.top': '가장 많이 import되는 모듈 (여기서 생긴 버그일수록 더 전투력이 높습니다):', // EN: 'Most depended-on modules (a bug here hits harder):'
    'scan.row': '{name}: {n}개의 파일에서 import', // EN: '{name} imported by {n} file(s)'

    'ladder.none': '{dir}에 대전 가능한 플레이어가 없습니다. 팀을 공유한 플레이어가 있어야 합니다 (bugzoo share).', // EN: 'No battle-ready players in {dir}. Players need a shared team (bugzoo share).'
    'ladder.you': '나', // EN: 'you'
    'ladder.challengeable': '도전 가능', // EN: 'challengeable'
    'ladder.ask': '도전할 순위를 고르세요 (번호, q는 종료) ', // EN: 'Challenge which rank? (number, or q to quit) '
    'ladder.badRank': '1에서 {max} 사이의 숫자(순위)를 고르세요.', // EN: 'Pick a rank between 1 and {max}.'
    'ladder.cannot': '다음과 같은 이유로 도전할 수 없습니다: {reason}.', // EN: 'Cannot challenge: {reason}.'
    'ladder.err.notOnLadder': '{name}은(는) 래더에 없습니다 (먼저 팀을 공유하세요)', // EN: '{name} is not on the ladder (share a team first)'
    'ladder.err.self': '자기 자신에게는 도전할 수 없습니다', // EN: 'you cannot challenge yourself'
    'ladder.err.below': '{name}은(는) 나보다 순위가 낮습니다', // EN: '{name} is ranked below you'
    'ladder.err.reach': '나보다 최대 {reach}단계 위의 상대까지만 도전할 수 있습니다', // EN: 'you can only challenge up to {reach} ranks above you'
    'ladder.lose': '패배. {name}이(가) #{rank} 자리를 지켰습니다. 대전 결과는 팀이 바뀌어야만 달라집니다 - 더 강한 버그를 잡고 다시 도전하세요.', // EN: 'You lose. {name} holds #{rank}. The fight is deterministic, so this only changes if a team does - catch stronger bugs and try again.'
    'ladder.win': '승리! {name}에게서 #{to} 자리를 빼앗았습니다 (이전 #{from}).', // EN: 'You win! You take #{to} from {name} (you were #{from}).'
    'ladder.wrote': '{file} 작성 완료.', // EN: 'Wrote {file}.'
    'ladder.commit': '{mine}와(과) 함께 commit하고 pull request를 여세요. 병합되면 래더 순위가 올라갑니다.', // EN: 'Commit it with {mine} and open a pull request; the ladder promotes you when it is merged.'
    'ladder.processed': '래더 갱신: 플레이어 {players}명, 도전 {n}건 처리.', // EN: 'Ladder updated: {players} player(s), {n} challenge(s) processed.'

    'setup.name': '플레이어 이름 (리더보드에 표시, 건너뛰려면 Enter): ', // EN: 'Player name (shown on leaderboards, Enter to skip): '
    'setup.done': '설정 완료! 언어: {lang}, 이름: {name}. 언제든 `bugzoo setup`으로 바꿀 수 있습니다.', // EN: 'All set! Language: {lang}, name: {name}. Change it any time with `bugzoo setup`.'
    'setup.noName': '(설정 안 됨)', // EN: '(not set)'
    'setup.nameHint': '아직 플레이어 이름이 없습니다. 공유하기 전에 `bugzoo setup --name <name>`으로 정하세요.', // EN: 'No player name yet. Set one with `bugzoo setup --name <name>` before sharing.'

    // EN: 'Also catch bugs automatically whenever you run a project by hand? Optional: `bugzoo run <command>` works without it.\n  Turning it on edits your user environment variable and terminal profiles; undo any time with `bugzoo setup --auto off`. [y/N]: '
    'setup.auto': '직접 프로젝트를 실행할 때마다 버그를 자동으로 잡을까요? 선택 사항입니다: 이 기능 없이도 `bugzoo run <command>`는 동작합니다.\n  켜면 사용자 환경 변수와 터미널 프로필이 수정됩니다. `bugzoo setup --auto off`로 언제든 되돌릴 수 있습니다. [y/N]: ',
    'setup.autoOn': '자동 포획이 켜졌습니다. 새 터미널을 여세요. 그곳에서 직접 실행하는 모든 것이 포획됩니다.', // EN: 'Auto-capture is ON. Open a new terminal; whatever you run by hand there is captured.'
    'setup.step.node': '  - Node 프로그램: 터미널에서 시작한 모든 프로젝트 (NODE_OPTIONS)', // EN: '  - Node programs: any project, started from a terminal (NODE_OPTIONS)'
    'setup.step.cmd': '  - 명령 프롬프트: python, go, cargo, java, npm, ... (AutoRun)', // EN: '  - Command Prompt: python, go, cargo, java, npm, ... (AutoRun)'
    'setup.step.ps': '  - PowerShell: python, go, cargo, java, npm, ... ({file})', // EN: '  - PowerShell: python, go, cargo, java, npm, ... ({file})'
    'setup.step.sh': '  - 셸 프로필 수정됨: {file}', // EN: '  - Shell profile updated: {file}'
    'setup.warn.policy': 'PowerShell 실행 정책이 {policy}(이)라서 PowerShell이 프로필을 무시합니다. 내 프로필을 허용하려면 한 번만 실행하세요: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned', // EN: 'PowerShell execution policy is {policy}, so PowerShell will ignore the profile. To allow your own profile, run once: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned'
    'setup.autoOff': '자동 포획 기능이 꺼졌습니다.', // EN: 'Auto-capture is OFF.'
    'setup.autoFail': '자동 포획 설정을 바꿀 수 없습니다: {error}', // EN: 'Could not change auto-capture: {error}'
    'setup.status': '언어: {lang} | 이름: {name} | 자동 포획: {auto}', // EN: 'Language: {lang} | Name: {name} | Auto-capture: {auto}'
    'evo.tag': '[진화 완료]', // EN: '[EVOLVED]'
    'evo.line': '{name}이(가) {stage} 형태로 진화했다! 전투력 x{mult}.', // EN: '{name} evolved into its {stage} form! Power x{mult}.'
    'evo.stage0': '유충', // EN: 'base'
    'evo.stage1': '탈피', // EN: 'Evolved'
    'evo.stage2': '초월', // EN: 'Ascended'
    'evo.next': '{n}번 더 잡으면 다음 형태로 진화', // EN: 'next form after {n} more catch(es)'
    'evo.max': '최종 진화 형태', // EN: 'final form'
    'ach.tag': '[업적]', // EN: '[ACHIEVEMENT]'
    'ach.title': '업적: {n}/{total}', // EN: 'Achievements: {n}/{total}'
    'ach.on': '{date} 달성', // EN: 'unlocked {date}'
    'ach.off': '잠금 상태', // EN: 'locked'
    'ach.first-catch.name': '첫 포획', // EN: 'First catch'
    'ach.first-catch.desc': '첫 버그를 잡아보세요.', // EN: 'Catch your first bug.'
    'ach.collector.name': '수집가', // EN: 'Collector'
    'ach.collector.desc': '서로 다른 버그 10마리를 잡으세요.', // EN: 'Catch 10 different bugs.'
    'ach.many-types.name': '노련한 여행자', // EN: 'Well travelled'
    'ach.many-types.desc': '서로 다른 에러 타입 5가지를 잡으세요.', // EN: 'Catch 5 different error types.'
    'ach.rare-find.name': '레어 버그 발견', // EN: 'Rare find'
    'ach.rare-find.desc': '레어 버그를 잡으세요.', // EN: 'Catch a rare bug.'
    'ach.legend.name': '레전더리 사냥꾼', // EN: 'Legend hunter'
    'ach.legend.desc': '레전더리 버그를 잡으세요.', // EN: 'Catch a legendary bug.'
    'ach.persistent.name': '오랜 친구', // EN: 'Old acquaintance'
    'ach.persistent.desc': '같은 버그를 3번 잡고 진화하는 모습을 지켜보세요.', // EN: 'Catch the same bug 3 times and watch it evolve.'
    'ach.ascended.name': '초월', // EN: 'Ascended'
    'ach.ascended.desc': '같은 버그를 10번 잡으세요.', // EN: 'Catch the same bug 10 times.'
    'ach.big-game.name': '대왕 버그 사냥', // EN: 'Big game'
    'ach.big-game.desc': '전투력 100 이상인 버그를 잡으세요.', // EN: 'Catch a bug with 100 or more power.'
    'ach.streak-3.name': '3일 연속', // EN: 'Three days running'
    'ach.streak-3.desc': '3일 연속으로 버그를 잡으세요.', // EN: 'Catch a bug 3 days in a row.'
    'ach.streak-7.name': '버그와 함께한 일주일', // EN: 'A week of bugs'
    'ach.streak-7.desc': '7일 연속으로 버그를 잡으세요.', // EN: 'Catch a bug 7 days in a row.'
    'ach.first-win.name': '첫 승리', // EN: 'First blood'
    'ach.first-win.desc': '첫 대전에서 승리하세요.', // EN: 'Win your first battle.'
    'ach.friendly.name': '혼자가 아니야', // EN: 'Not alone'
    'ach.friendly.desc': '친구를 추가하세요.', // EN: 'Add a friend.'
    'ach.slippery.name': '놓쳐버린 버그', // EN: 'It got away'
    'ach.slippery.desc': '버그를 놓쳐보세요.', // EN: 'Let a bug escape.'
    'card.title': 'Bug Zoo 대전', // EN: 'Bug Zoo battle'
    'card.win': '{winner} 승리!', // EN: '{winner} wins!'
    'card.rounds': '{n}회 공격', // EN: '{n} hits'
    'card.footer': 'npm install -g bug-zoo', // EN: 'npm install -g bug-zoo' (a command: keep as is)
    'card.ask': '이 대전 결과를 공유용 카드로 저장할까요? [y/N]: ', // EN: 'Save a shareable card of this battle? [y/N]: '
    'card.saved': '{file} 저장 완료. 같은 대전이면 언제나 같은 카드가 나옵니다.', // EN: 'Saved {file}. Same fight, same card: it is deterministic.'
    'title.Bystander': '구경꾼', // EN: 'Bystander'
    'title.Bug Spotter': '버그 탐지꾼', // EN: 'Bug Spotter'
    'title.Bug Catcher': '버그 사냥꾼', // EN: 'Bug Catcher'
    'title.Exterminator': '버그 박멸가', // EN: 'Exterminator'
    'title.Zookeeper': '도감 관리인', // EN: 'Zookeeper'
    'title.Bug Whisperer': '버그 조련사', // EN: 'Bug Whisperer'
    'rank.points': '점수: 커먼 {c}, 언커먼 {u}, 레어 {r}, 레전더리 {l}; 반복 포획 1회당 +2', // EN: 'Points: common {c}, uncommon {u}, rare {r}, legendary {l}; each repeat catch +2'
    'setup.aiOn': 'AI 세션: {file}에 hook을 추가했습니다. 이제 AI 어시스턴트가 실행한 명령이 실패하거나 고쳐지면 버그가 나타납니다. 적용하려면 클로드 코드를 다시 시작하세요.', // EN: 'AI sessions: hook added to {file}. Monsters now appear when commands your AI assistant runs fail or get fixed. Restart Claude Code to load it.'
    'setup.aiOff': 'AI 세션: {file}에서 hook을 제거했습니다.', // EN: 'AI sessions: hook removed from {file}.'
    'setup.aiFail': 'AI 훅을 바꿀 수 없습니다: {error}', // EN: 'Could not change the AI hook: {error}'
    'setup.aiStatus': 'AI 세션 (클로드 코드): {state}', // EN: 'AI sessions (Claude Code): {state}'
    'common.on': '켜짐', // EN: 'on'
    'common.off': '꺼짐', // EN: 'off'

    'battle.secLadder': '래더', // EN: 'Ladder'
    'battle.secFriends': '친구', // EN: 'Friends'
    'battle.secPractice': '연습하기', // EN: 'Practice'
    'battle.rowPower': '전투력 {p}', // EN: 'power {p}'
    'battle.tagYou': '나', // EN: 'you'
    'battle.tagRanked': '순위에 반영', // EN: 'counts for ranking'
    'battle.ask': '누구와 대전할까요? (번호, q는 종료) ', // EN: 'Fight whom? (number, or q to quit) '
    'battle.badPick': '목록에서 번호를 고르세요.', // EN: 'Pick a number from the list.'
    'battle.cachedLadder': '래더를 불러올 수 없습니다 ({reason}). {when}에 저장된 사본을 사용합니다.', // EN: 'Ladder unavailable ({reason}); using the copy saved on {when}.'
    'battle.noLadder': '래더를 불러올 수 없습니다 ({reason}). 친구 대전과 연습은 그대로 할 수 있습니다.', // EN: 'Ladder unavailable ({reason}). Friends and practice are still here.'
    'battle.friendly': '친선전: 래더에는 영향을 주지 않습니다.', // EN: 'Friendly fight: this does not change the ladder.'
    'battle.outOfReach': '친선전: 래더 순위는 나보다 최대 {reach}단계 위의 상대를 이겨야만 오릅니다.', // EN: 'Friendly fight: you only climb by beating someone up to {reach} ranks above you.'
    'battle.promote': '#{rank} {name}을(를) 이겼습니다! 제출하면 그 자리를 차지합니다:', // EN: 'You beat #{rank} {name}! Submit it to take their spot:'
    'battle.join': '아직 래더에 없습니다. 이 대전을 제출하면 맨 아래 순위로 참가합니다 (승패 무관):', // EN: 'You are not on the ladder yet. Submit this fight to join it at the bottom (win or lose):'
    'battle.needName': '래더 결과를 제출하려면 먼저 플레이어 이름을 정하세요 (bugzoo setup --name <name>).', // EN: 'Set a player name first (bugzoo setup --name <name>) to submit ladder results.'
    'battle.openAsk': '지금 브라우저에서 열까요? [Y/n]: ', // EN: 'Open it in your browser now? [Y/n]: '
    'battle.opened': '열었습니다. "Submit new issue"를 누르세요. 1~2분 안에 래더가 갱신됩니다.', // EN: 'Opened. Press "Submit new issue"; the ladder updates within a minute or two.'
    'battle.submitNote': '래더는 공유된 팀으로 이 대전을 재현하므로 결과를 조작할 수 없습니다.', // EN: 'The ladder replays this fight from your shared team, so results cannot be faked.'

    'friend.usage': '사용법: bugzoo friend [list] | code | add <code|url|file|name> | remove <name> | refresh', // EN: 'Usage: bugzoo friend [list] | code | add <code|url|file|name> | remove <name> | refresh'
    'friend.empty': '아직 친구가 없습니다. 친구에게 코드를 받은 뒤 (친구가 `bugzoo friend code` 실행): bugzoo friend add <code>', // EN: 'No friends yet. Ask a friend for their code (they run `bugzoo friend code`), then: bugzoo friend add <code>'
    'friend.title': '친구', // EN: 'Friends'
    'friend.row': '{name}  전투력 {p}  ({kind})', // EN: '{name}  power {p}  ({kind})'
    'friend.code': '내 친구 코드입니다. 친구에게 보내면 친구가 `bugzoo friend add <code>`를 실행합니다:', // EN: 'Your friend code. Send it to a friend; they run `bugzoo friend add <code>`:'
    'friend.needTeam': '먼저 버그를 잡으세요: 친구 코드에는 내 팀이 담깁니다.', // EN: 'Catch a bug first: your friend code carries your team.'
    'friend.needName': '먼저 플레이어 이름을 정하세요: bugzoo setup --name <name>', // EN: 'Set a player name first: bugzoo setup --name <name>'
    'friend.added': '{name}을(를) 추가했습니다 (팀 전투력 {p}).', // EN: 'Added {name} (team power {p}).'
    'friend.updated': '{name}을(를) 갱신했습니다 (팀 전투력 {p}).', // EN: 'Updated {name} (team power {p}).'
    'friend.removed': '{name}을(를) 제거했습니다.', // EN: 'Removed {name}.'
    'friend.notFound': '{name}(이)라는 친구가 없습니다.', // EN: 'No friend named {name}.'
    'friend.bad': '친구 정보를 읽을 수 없습니다. 친구 코드 (BZ1.…), JSON URL이나 파일, 또는 래더의 플레이어 이름을 사용하세요.', // EN: 'Could not read a friend from that. Use a friend code (BZ1.…), a JSON URL or file, or a player name from the ladder.'
    'friend.self': '본인은 친구로 추가할 수 없습니다.', // EN: 'That is you.'
    'friend.refreshed': '친구 {n}명을 갱신했습니다. {failed}명은 연결할 수 없었습니다.', // EN: 'Refreshed {n} friend(s); {failed} could not be reached.'
    'friend.kind.code': '코드', // EN: 'code'
    'friend.kind.url': '링크', // EN: 'link'
    'friend.kind.file': '파일', // EN: 'file'
    'friend.kind.ladder': '래더', // EN: 'ladder'

    'hook.usage': '사용법: bugzoo hook <bash|zsh|fish|powershell>', // EN: 'Usage: bugzoo hook <bash|zsh|fish|powershell>'
    'misc.unknown': '알 수 없는 명령: {cmd}', // EN: 'Unknown command: {cmd}'
    'misc.runUsage': '사용법: bugzoo run <command...>', // EN: 'Usage: bugzoo run <command...>'
    'misc.leaderUsage': '사용법: bugzoo leaderboard <dir|file...> [--out file.md]', // EN: 'Usage: bugzoo leaderboard <dir|file...> [--out file.md]'
    'misc.wrote': '{file} 작성 완료', // EN: 'Wrote {file}'
    'misc.leaderWrote': '{file} 작성 완료 (유효 {valid}개, 건너뜀 {skipped}개)', // EN: 'Wrote {file} ({valid} valid, {skipped} skipped)'
    'svg.title': 'Bug Zoo · 포획 {caught} / 발견 {seen}', // EN: 'Bug Zoo · {caught} caught / {seen} seen'

    // bugzoo lang
    'lang.title': '언어 (현재 언어는 * 표시):', // EN: 'Languages (current marked with *):'
    'lang.ask': '번호를 고르거나, 그대로 두려면 Enter를 누르세요: ', // EN: 'Pick a number, or press Enter to keep it: '
    'lang.set': '언어를 {lang}(으)로 설정했습니다.', // EN: 'Language set to {lang}.'
    'lang.bad': '알 수 없는 언어 "{value}". 사용 가능: {list}', // EN: 'Unknown language "{value}". Available: {list}'

    // bugzoo ladder join
    'ladder.join.intro': '래더 참가: 내 팀이 {defender}(최하위)와 참가전을 치릅니다. 승패와 관계없이 맨 아래 순위로 참가하며, 이기면 그 자리를 차지합니다.', // EN: 'Joining the ladder: your team plays an entry fight against {defender} (last place). You join at the bottom win or lose, and a win takes their spot.'
    'ladder.join.already': '이미 래더 #{rank}에 있습니다. 순위를 올리려면 `bugzoo battle`로 위의 상대와 대전하세요.', // EN: 'You are already on the ladder, at #{rank}. Fight someone above you with `bugzoo battle` to climb.'
    'ladder.join.empty': '래더에 아직 대전할 상대가 없어서 참가할 수 없습니다. 나중에 다시 시도하세요.', // EN: 'The ladder has nobody to fight yet, so there is nothing to join. Try again later.'
    'ladder.join.needCatch': '먼저 버그를 잡으세요: 팀은 플레이어가 잡은 버그로 구성됩니다. 실패하는 명령을 실행하고, 고친 뒤 다시 실행하세요.', // EN: 'Catch a bug first: your team is made from your catches. Run a command that fails, fix it, and run it again.'
    'ladder.joinHint': '명령 한 줄로 래더에 참가하세요: bugzoo ladder join', // EN: 'Join the ladder with one command: bugzoo ladder join'

    // VS Code extension (vscode/): the zoo view, the ladder panel and the notifications.
    'vs.caught': '포획', // EN: 'caught'
    'vs.seen': '발견', // EN: 'seen'
    'vs.pen': '포획', // EN: 'caught'
    'vs.empty': '버그 도감이 비어 있습니다.<br>터미널에서 실패하는 명령을 실행하면<br>버그가 나타납니다.', // EN: 'The zoo is empty.<br>Run a command that fails in the terminal<br>and a monster will show up.'
    'vs.wild': '야생', // EN: 'wild'
    'vs.power': '전투력', // EN: 'power'
    'vs.evo': '진화 형태', // EN: 'form'
    'vs.since': '함께한 날', // EN: 'since'
    'vs.ladder': '래더', // EN: 'Ladder'
    'vs.offline': '오프라인 사본', // EN: 'offline copy'
    'vs.noladder': '래더를 불러올 수 없음', // EN: 'Ladder unavailable'
    'vs.friends': '친구', // EN: 'Friends'
    'vs.fight': '대전', // EN: 'Fight'
    'vs.you': '나', // EN: 'you'
    'vs.challenge': '이 플레이어에게 도전할 수 있습니다', // EN: 'You can challenge this player'
    'vs.practice': '연습하기', // EN: 'Practice'
    'vs.addFriend': '+ 친구 추가', // EN: '+ Add friend'
    'vs.copyCode': '내 코드 복사하기', // EN: 'Copy my code'
    'vs.remove': '제거하기', // EN: 'Remove'
    'vs.noTeam': '먼저 버그를 잡으세요: 팀은 플레이어가 잡은 버그 중 가장 강한 녀석으로 구성됩니다.', // EN: 'Catch a bug first: your team is made from your strongest catches.'
    'vs.win': '승리!', // EN: 'You win!'
    'vs.lose': '패배', // EN: 'You lose'
    'vs.close': '닫기', // EN: 'Close'
    'vs.submit': '래더에 제출', // EN: 'Submit to the ladder'
    'vs.replay': '다시보기', // EN: 'Replay'
    'vs.skip': '건너뛰기', // EN: 'Skip'
    'vs.promote': '{name}을(를) 이겼습니다! GitHub에 이 승리 기록을 제출하면 상대의 자리를 차지합니다.', // EN: 'You beat {name}! Submit this win on GitHub to take their spot.'
    'vs.join': 'GitHub에 팀을 제출해서 래더에 참가하세요.', // EN: 'Submit your team on GitHub to join the ladder.'
    'vs.outOfReach': '멋진 승리예요! 하지만 래더 순위는 나보다 최대 {reach}단계 위의 플레이어를 이겨야만 바뀝니다.', // EN: 'Nice win, but the ladder only moves for players up to {reach} ranks above you.'
    'vs.friendly': '친선전: 래더에는 영향을 주지 않습니다.', // EN: 'A friendly fight: it does not change the ladder.'
    'vs.lost': '버그를 더 고치고, 팀을 키운 뒤 다시 도전하세요.', // EN: 'Fix a few more bugs, grow your team and try again.'
    'vs.practiceNote': '연습 대전은 기록되지 않습니다.', // EN: 'Practice fight: it does not count.'
    'vs.hits': '공격', // EN: 'hits'
    'vs.crit': '급소에 맞았다!', // EN: 'critical!'
    'vs.gone': '상대가 더 이상 목록에 없습니다.', // EN: 'That opponent is no longer on the list.'
    'vs.kind.code': '코드', // EN: 'code'
    'vs.kind.url': '링크', // EN: 'link'
    'vs.kind.file': '파일', // EN: 'file'
    'vs.kind.ladder': '래더', // EN: 'ladder'
    'vs.vs': 'vs', // EN: 'vs'
    'vs.achievement': '업적', // EN: 'Achievement'
    'vs.nameTitle': 'Bug Zoo 플레이어 이름', // EN: 'Bug Zoo player name'
    'vs.namePrompt': '래더에 표시될 이름 (다른 플레이어에게 보입니다)', // EN: 'Your name on the ladder (shown to other players)'
    'vs.namePick': '이름을 정하세요', // EN: 'Pick a name'
    'vs.addTitle': '친구 추가', // EN: 'Add a friend'
    'vs.addPrompt': '친구 코드 (BZ1...), 링크, 파일 경로, 또는 래더의 플레이어 이름을 붙여 넣으세요', // EN: 'Paste a friend code (BZ1...), a link, a file path, or a player name from the ladder'
    'vs.friendAdded': '{name}을(를) 추가했습니다.', // EN: 'Added {name}.'
    'vs.friendUpdated': '{name}을(를) 갱신했습니다.', // EN: 'Updated {name}.'
    'vs.friendSelf': '본인은 친구로 추가할 수 없습니다', // EN: 'That is you!'
    'vs.friendBad': '친구 정보를 읽을 수 없습니다.', // EN: 'Could not read that friend.'
    'vs.needCatch': '먼저 버그를 잡으세요: 친구 코드는 내가 잡은 가장 강한 버그로 만들어집니다.', // EN: 'Catch a bug first: your friend code is made from your strongest catches.'
    'vs.codeCopied': '친구 코드를 복사했습니다. 친구에게 보내면 친구가 "친구 추가"에 붙여 넣습니다.', // EN: 'Friend code copied. Send it to a friend; they paste it into Add friend.'
    'vs.statusCaught': '$(check) Bug Zoo: {creature} 포획 완료!', // EN: '$(check) Bug Zoo: caught {creature}!'
    'vs.notifyCaught': '{creature}을(를) 잡았다! 내가 잡은 버그가 도감에 등록되었습니다.', // EN: 'Caught {creature}! It joined your zoo.'
    'vs.statusSpawned': '$(bug) Bug Zoo: 야생의 {creature}이(가) 나타났다', // EN: '$(bug) Bug Zoo: a wild {creature} appeared'
    'vs.notifySpawned': '야생의 {creature}이(가) 나타났다! 버그를 고치고 명령을 다시 실행하면 버그를 잡을 수 있습니다.', // EN: 'A wild {creature} appeared! Fix the bug and re-run the command to catch it.'
    'vs.openZoo': '버그 도감 열기', // EN: 'Open the zoo'
    'vs.captureOn': 'Bug Zoo 터미널 포획 켜짐.', // EN: 'Bug Zoo terminal capture on.'
    'vs.captureOff': 'Bug Zoo 터미널 포획 꺼짐.', // EN: 'Bug Zoo terminal capture off.'
    'vs.langTitle': 'Bug Zoo 언어', // EN: 'Bug Zoo language'
    'vs.langPlaceholder': 'Bug Zoo에서 사용할 언어를 고르세요', // EN: 'Choose the language for Bug Zoo'
    'vs.langSet': 'Bug Zoo 언어 설정: {lang}.', // EN: 'Bug Zoo language: {lang}.'
    'vs.creature': '{type} {name}', // EN: '{name} the {type}'
  },
};

'use strict';

// Language file. To add a language, run `npm run lang -- <code> <label>` and translate `messages` and `help`.
module.exports = {
  code: 'es',
  label: 'Español',
  // Locale prefixes that select this language (the longest match wins), e.g. LANG=zh_TW.UTF-8 -> 'zh-tw'.
  // position in the language picker (omit to go after the built-in ones)
  detect: ['es'],
  // Monster names are prefix + suffix, picked from the error's hash. The two lists may have any length.
  names: {
    // EN: ['Grim', 'Fluff', 'Snark', 'Wobble', 'Gloom', 'Zap', 'Murk', 'Pip', 'Crumb', 'Hex', 'Glitch', 'Nib']
    prefix: ['Sombra', 'Pelusa', 'Burla', 'Meneo', 'Niebla', 'Chispa', 'Bruma', 'Pitido', 'Miga', 'Hechizo', 'Glitch', 'Púa'],
    // EN: ['ling', 'bat', 'gnaw', 'moth', 'toad', 'wisp', 'beetle', 'imp', 'crawler', 'snail', 'sprite', 'mite']
    suffix: ['bicho', 'murciélago', 'roedor', 'polilla', 'sapo', 'fueguito', 'escarabajo', 'diablillo', 'gusano', 'caracol', 'duende', 'ácaro'],
  },
  help: `bugzoo - convierte tus errores en monstruos coleccionables

Uso:
  bugzoo setup [--lang <código>] [--name N] [--auto on|off] [--ai on|off]
                              Idioma, nombre de jugador, captura automática y
                              monstruos para los comandos que ejecuta tu
                              asistente de IA (Claude Code)
  bugzoo lang [código]       Muestra los idiomas o cambia: bugzoo lang es
  bugzoo run <comando...>    Ejecuta un comando. Si falla, aparece un bug.
                              (No hace falta con la captura automática activada.)
  bugzoo dex                 Tu colección y los bugs que esperan ser capturados
  bugzoo team                 Tus capturas más fuertes, con su evolución
  bugzoo achievements         Tus logros
  bugzoo battle [--card f.svg]
                              Muestra la escalera, tus amigos y un oponente de
                              práctica; escribe un número para combatir.
                              --card guarda una tarjeta compartible del
                              resultado
  bugzoo friend               Lista amigos   (también: code | add <código|url|archivo|nombre>
                              | remove <nombre> | refresh)
  bugzoo ladder [dir]         Muestra la escalera
  bugzoo ladder join          Únete a la escalera en un paso (necesitas una captura y un nombre)
  bugzoo scan                 Escanea este proyecto: tamaño y módulos con más dependencias
  bugzoo rank                 Muestra tu puntuación y tu título
  bugzoo share [--name N] [--out archivo]
                              Escribe un archivo compartible de puntuación y equipo (sin texto de error)
  bugzoo leaderboard <dir|archivo...> [--out archivo.md]
                              Construye una clasificación de puntuaciones a partir de archivos compartidos
  bugzoo hook <bash|zsh|fish|powershell>
                              Imprime un fragmento que envuelve los comandos de desarrollo habituales
  bugzoo export [archivo]     Exporta el bestiario como SVG (por defecto: bugzoo.svg)
  bugzoo help                 Muestra esta ayuda

Reglas de captura (volver a ejecutar el mismo comando en la misma carpeta;
las banderas y los argumentos numéricos se ignoran al comparar):
  ejecución limpia     capturado
  el mismo bug          sigue ahí
  algunos bugs fuera   quedan capturados
  aparece un bug nuevo escapó - el bug nuevo se convierte en tu objetivo

Vencer a alguien hasta 3 puestos por encima de ti en la escalera le quita su sitio.
`,
  messages: {
    'fmt.creature': '{name} el {type}',
    'fmt.power': '{label} (poder {power})',
    'rarity.common': 'común',
    'rarity.uncommon': 'poco común',
    'rarity.rare': 'raro',
    'rarity.legendary': 'legendario',

    'enc.appeared': '¡Un {type} salvaje apareció!',
    'enc.new': '* NUEVO *',
    'enc.seen': 'visto x{n}',
    'enc.power': 'tamaño del bug: poder {power}',

    'out.caughtTag': '[CAPTURADO]',
    'out.escapedTag': '[ESCAPÓ]',
    'out.captured': '¡Ejecución limpia! Capturaste a {names}.',
    'out.partial': 'Capturaste a {names}.',
    'out.partial2': 'Siguen sueltos: {names}. Sigue arreglando y ejecuta de nuevo.',
    'out.still': 'Sigue ahí: {names}. Arréglalo y ejecuta de nuevo.',
    'out.failed': '{names} se escaparon - tu arreglo introdujo algo nuevo.',
    'out.failed2': 'Nuevos objetivos: {names}. Arregla y ejecuta de nuevo para capturarlos.',
    'out.wild': 'Arregla el bug y ejecuta el mismo comando otra vez para capturarlo.',

    'dex.empty': 'Tu bestiario está vacío. Ejecuta `bugzoo run <comando>` y deja que algo se rompa.',
    'dex.title': 'Bug Zoo - {caught} capturados / {seen} vistos',
    'dex.caught': 'capturado x{n}',
    'dex.wild': 'salvaje',
    'dex.pending': '{n} bug(s) esperando ser capturados.',

    'team.empty': 'Aún no tienes trofeos. Captura un bug primero: arréglalo y vuelve a ejecutar el mismo comando.',
    'team.title': 'Tus capturas más fuertes (las 3 primeras combaten)',
    'team.power': 'poder',
    'factor.depth': 'profundidad',
    'factor.blast': 'impacto',
    'factor.size': 'tamaño',
    'factor.rate': 'tasa',

    'battle.hit': '{att} golpea a {def} y causa {dmg} de daño',
    'battle.crit': ' (¡crítico!)',
    'battle.faint': ' - ¡{def} se desmaya!',
    'battle.left': ' (le quedan {hp} de vida)',
    'battle.you': 'Tú',
    'battle.win': '¡Ganaste! {winner} derrotó a {loser}.',
    'battle.lose': 'Perdiste. {winner} derrotó a {loser}.',
    'battle.noTrophy': 'Todavía no tienes trofeos. Captura un bug primero: arréglalo y vuelve a ejecutar el mismo comando.',

    'share.needName': 'Elige primero un nombre público de jugador: bugzoo share --name <nombre>',
    'share.wrote': 'Se escribió {file} ({name}, {score} puntos, equipo de {n}).',

    'rank.title': 'Título: {title}',
    'rank.score': 'Puntuación: {score}',
    'rank.caught': 'Capturados: {c} comunes, {u} poco comunes, {r} raros, {l} legendarios  (+{rep} capturas repetidas, {seen} vistos)',
    'rank.battles': 'Combates: {w} ganados, {l} perdidos',

    'scan.project': 'Proyecto: {name}',
    'scan.files': 'Archivos: {files}   Líneas: {loc}',
    'scan.top': 'Módulos con más dependencias (un bug aquí golpea más fuerte):',
    'scan.row': '{name} importado por {n} archivo(s)',

    'ladder.none': 'No hay jugadores listos para combatir en {dir}. Necesitan un equipo compartido (bugzoo share).',
    'ladder.you': 'tú',
    'ladder.challengeable': 'retable',
    'ladder.ask': '¿A qué puesto desafías? (número, o q para salir) ',
    'ladder.badRank': 'Elige un puesto entre 1 y {max}.',
    'ladder.cannot': 'No puedes desafiar: {reason}.',
    'ladder.err.notOnLadder': '{name} no está en la escalera (comparte un equipo primero)',
    'ladder.err.self': 'no puedes desafiarte a ti mismo',
    'ladder.err.below': '{name} está por debajo de ti',
    'ladder.err.reach': 'solo puedes desafiar hasta {reach} puestos por encima de ti',
    'ladder.lose': 'Perdiste. {name} defiende el puesto {rank}. El combate es determinista, así que solo cambia si cambia un equipo - captura bugs más fuertes y vuelve a intentarlo.',
    'ladder.win': '¡Ganaste! Tomas el puesto {to} de {name} (estabas en el {from}).',
    'ladder.wrote': 'Se escribió {file}.',
    'ladder.commit': 'Haz commit con {mine} y abre un pull request; la escalera te asciende al fusionarse.',
    'ladder.processed': 'Escalera actualizada: {players} jugador(es), {n} desafío(s) procesados.',

    'setup.name': 'Nombre del jugador (se muestra en las clasificaciones, Enter para saltarlo): ',
    'setup.done': '¡Todo listo! Idioma: {lang}, nombre: {name}. Cámbialo cuando quieras con `bugzoo setup`.',
    'setup.noName': '(sin definir)',
    'setup.nameHint': 'Aún no tienes nombre de jugador. Define uno con `bugzoo setup --name <nombre>` antes de compartir.',

    'setup.auto': '¿También capturar bugs automáticamente cuando ejecutas un proyecto a mano? Es opcional: `bugzoo run <comando>` funciona sin ello.\n  Activarlo edita tu variable de entorno de usuario y tus perfiles de terminal; deshazlo cuando quieras con `bugzoo setup --auto off`. [s/N]: ',
    'setup.autoOn': 'Captura automática ACTIVADA. Abre una terminal nueva; lo que ejecutes a mano allí se captura.',
    'setup.step.node': '  - Programas de Node: cualquier proyecto, iniciado desde una terminal (NODE_OPTIONS)',
    'setup.step.cmd': '  - Símbolo del sistema: python, go, cargo, java, npm, ... (AutoRun)',
    'setup.step.ps': '  - PowerShell: python, go, cargo, java, npm, ... ({file})',
    'setup.step.sh': '  - Perfil de shell actualizado: {file}',
    'setup.warn.policy': 'La política de ejecución de PowerShell es {policy}, así que PowerShell ignorará el perfil. Para permitir tu propio perfil, ejecuta una vez: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned',
    'setup.autoOff': 'Captura automática DESACTIVADA.',
    'setup.autoFail': 'No se pudo cambiar la captura automática: {error}',
    'setup.status': 'Idioma: {lang} | Nombre: {name} | Captura automática: {auto}',
    'evo.tag': '[EVOLUCIONADO]',
    'evo.line': '¡{name} evolucionó a su forma {stage}! Poder x{mult}.',
    'evo.stage0': 'base',
    'evo.stage1': 'Evolucionado',
    'evo.stage2': 'Ascendido',
    'evo.next': 'siguiente forma tras {n} captura(s) más',
    'evo.max': 'forma final',
    'ach.tag': '[LOGRO]',
    'ach.title': 'Logros: {n}/{total}',
    'ach.on': 'desbloqueado el {date}',
    'ach.off': 'bloqueado',
    'ach.first-catch.name': 'Primera captura',
    'ach.first-catch.desc': 'Captura tu primer bug.',
    'ach.collector.name': 'Coleccionista',
    'ach.collector.desc': 'Captura 10 bugs distintos.',
    'ach.many-types.name': 'Muy viajado',
    'ach.many-types.desc': 'Captura 5 tipos de error distintos.',
    'ach.rare-find.name': 'Hallazgo raro',
    'ach.rare-find.desc': 'Captura un bug raro.',
    'ach.legend.name': 'Cazador de leyendas',
    'ach.legend.desc': 'Captura un bug legendario.',
    'ach.persistent.name': 'Viejo conocido',
    'ach.persistent.desc': 'Captura el mismo bug 3 veces y mira cómo evoluciona.',
    'ach.ascended.name': 'Ascendido',
    'ach.ascended.desc': 'Captura el mismo bug 10 veces.',
    'ach.big-game.name': 'Gran presa',
    'ach.big-game.desc': 'Captura un bug con 100 o más de poder.',
    'ach.streak-3.name': 'Tres días seguidos',
    'ach.streak-3.desc': 'Captura un bug 3 días seguidos.',
    'ach.streak-7.name': 'Una semana de bugs',
    'ach.streak-7.desc': 'Captura un bug 7 días seguidos.',
    'ach.first-win.name': 'Primera sangre',
    'ach.first-win.desc': 'Gana tu primer combate.',
    'ach.friendly.name': 'No estás solo',
    'ach.friendly.desc': 'Añade un amigo.',
    'ach.slippery.name': 'Se escapó',
    'ach.slippery.desc': 'Deja que un bug escape.',
    'card.title': 'Combate de Bug Zoo',
    'card.win': '¡{winner} gana!',
    'card.rounds': '{n} golpes',
    'card.footer': 'npm install -g bug-zoo',
    'card.ask': '¿Guardar una tarjeta compartible de este combate? [s/N]: ',
    'card.saved': 'Guardado en {file}. Mismo combate, misma tarjeta: es determinista.',
    'title.Bystander': 'Espectador',
    'title.Bug Spotter': 'Rastreador de bugs',
    'title.Bug Catcher': 'Cazabugs',
    'title.Exterminator': 'Exterminador',
    'title.Zookeeper': 'Zoólogo',
    'title.Bug Whisperer': 'Domabugs',
    'rank.points': 'Puntos: comunes {c}, poco comunes {u}, raros {r}, legendarios {l}; cada captura repetida +2',
    'setup.aiOn': 'Sesiones de IA: hook añadido a {file}. Ahora aparecen monstruos cuando fallan o se arreglan los comandos que ejecuta tu asistente de IA. Reinicia Claude Code para que se cargue.',
    'setup.aiOff': 'Sesiones de IA: hook eliminado de {file}.',
    'setup.aiFail': 'No se pudo cambiar el hook de IA: {error}',
    'setup.aiStatus': 'Sesiones de IA (Claude Code): {state}',
    'common.on': 'activado',
    'common.off': 'desactivado',

    'battle.secLadder': 'Escalera',
    'battle.secFriends': 'Amigos',
    'battle.secPractice': 'Práctica',
    'battle.rowPower': 'poder {p}',
    'battle.tagYou': 'tú',
    'battle.tagRanked': 'cuenta para el ranking',
    'battle.ask': '¿Contra quién combates? (número, o q para salir) ',
    'battle.badPick': 'Elige un número de la lista.',
    'battle.cachedLadder': 'Escalera no disponible ({reason}); se usa la copia guardada el {when}.',
    'battle.noLadder': 'Escalera no disponible ({reason}). Amigos y práctica siguen disponibles.',
    'battle.friendly': 'Combate amistoso: esto no cambia la escalera.',
    'battle.outOfReach': 'Combate amistoso: solo subes venciendo a alguien hasta {reach} puestos por encima de ti.',
    'battle.promote': '¡Venciste al puesto {rank} {name}! Envíalo para quitarle su sitio:',
    'battle.join': 'Aún no estás en la escalera. Envía este combate para unirte por abajo (ganes o pierdas):',
    'battle.needName': 'Define primero un nombre de jugador (bugzoo setup --name <nombre>) para enviar resultados a la escalera.',
    'battle.openAsk': '¿Abrirlo en tu navegador ahora? [S/n]: ',
    'battle.opened': 'Abierto. Pulsa "Submit new issue"; la escalera se actualiza en uno o dos minutos.',
    'battle.submitNote': 'La escalera reproduce este combate desde tu equipo compartido, así que los resultados no se pueden falsificar.',

    'friend.usage': 'Uso: bugzoo friend [list] | code | add <código|url|archivo|nombre> | remove <nombre> | refresh',
    'friend.empty': 'Aún no tienes amigos. Pide a un amigo su código (él ejecuta `bugzoo friend code`), luego: bugzoo friend add <código>',
    'friend.title': 'Amigos',
    'friend.row': '{name}  poder {p}  ({kind})',
    'friend.code': 'Tu código de amigo. Envíaselo a un amigo; él ejecuta `bugzoo friend add <código>`:',
    'friend.needTeam': 'Captura un bug primero: tu código de amigo lleva tu equipo.',
    'friend.needName': 'Define primero un nombre de jugador: bugzoo setup --name <nombre>',
    'friend.added': 'Añadido {name} (poder de equipo {p}).',
    'friend.updated': 'Actualizado {name} (poder de equipo {p}).',
    'friend.removed': 'Eliminado {name}.',
    'friend.notFound': 'No hay ningún amigo llamado {name}.',
    'friend.bad': 'No se pudo leer un amigo desde ahí. Usa un código de amigo (BZ1.…), una URL o un archivo JSON, o un nombre de jugador de la escalera.',
    'friend.self': 'Eres tú.',
    'friend.refreshed': 'Actualizados {n} amigo(s); {failed} no se pudieron contactar.',
    'friend.kind.code': 'código',
    'friend.kind.url': 'enlace',
    'friend.kind.file': 'archivo',
    'friend.kind.ladder': 'escalera',

    'hook.usage': 'Uso: bugzoo hook <bash|zsh|fish|powershell>',
    'misc.unknown': 'Comando desconocido: {cmd}',
    'misc.runUsage': 'Uso: bugzoo run <comando...>',
    'misc.leaderUsage': 'Uso: bugzoo leaderboard <dir|archivo...> [--out archivo.md]',
    'misc.wrote': 'Se escribió {file}',
    'misc.leaderWrote': 'Se escribió {file} ({valid} válidos, {skipped} omitidos)',
    'svg.title': 'Bug Zoo · {caught} capturados / {seen} vistos',

    // bugzoo lang
    'lang.title': 'Idiomas (el actual marcado con *):',
    'lang.ask': 'Elige un número, o pulsa Enter para mantenerlo: ',
    'lang.set': 'Idioma cambiado a {lang}.',
    'lang.bad': 'Idioma desconocido "{value}". Disponibles: {list}',

    // bugzoo ladder join
    'ladder.join.intro': 'Uniéndose a la escalera: tu equipo pelea un combate de entrada contra {defender} (último puesto). Te unes por abajo ganes o pierdas, y una victoria le quita su sitio.',
    'ladder.join.already': 'Ya estás en la escalera, en el puesto {rank}. Combate contra alguien por encima de ti con `bugzoo battle` para subir.',
    'ladder.join.empty': 'La escalera todavía no tiene a nadie a quien combatir, así que no hay nada que unir. Prueba más tarde.',
    'ladder.join.needCatch': 'Captura un bug primero: tu equipo se forma con tus capturas. Ejecuta un comando que falle, arréglalo y ejecuta de nuevo.',
    'ladder.joinHint': 'Únete a la escalera con un solo comando: bugzoo ladder join',

    // VS Code extension (vscode/): the zoo view, the ladder panel and the notifications.
    'vs.caught': 'capturado',
    'vs.seen': 'visto',
    'vs.pen': 'capturado',
    'vs.empty': 'El zoo está vacío.<br>Ejecuta en la terminal un comando que falle<br>y aparecerá un monstruo.',
    'vs.wild': 'salvaje',
    'vs.power': 'poder',
    'vs.evo': 'forma',
    'vs.since': 'desde',
    'vs.ladder': 'Escalera',
    'vs.offline': 'copia sin conexión',
    'vs.noladder': 'Escalera no disponible',
    'vs.friends': 'Amigos',
    'vs.fight': 'Combatir',
    'vs.you': 'tú',
    'vs.challenge': 'Puedes desafiar a este jugador',
    'vs.practice': 'Práctica',
    'vs.addFriend': '+ Añadir amigo',
    'vs.copyCode': 'Copiar mi código',
    'vs.remove': 'Eliminar',
    'vs.noTeam': 'Captura un bug primero: tu equipo se forma con tus capturas más fuertes.',
    'vs.win': '¡Ganaste!',
    'vs.lose': 'Perdiste',
    'vs.close': 'Cerrar',
    'vs.submit': 'Enviar a la escalera',
    'vs.replay': 'Repetir',
    'vs.skip': 'Saltar',
    'vs.promote': '¡Venciste a {name}! Envía esta victoria en GitHub para quitarle su sitio.',
    'vs.join': 'Envía tu equipo en GitHub para unirte a la escalera.',
    'vs.outOfReach': 'Buena victoria, pero la escalera solo se mueve al vencer a jugadores hasta {reach} puestos por encima de ti.',
    'vs.friendly': 'Combate amistoso: no cambia la escalera.',
    'vs.lost': 'Arregla unos bugs más, haz crecer tu equipo y vuelve a intentarlo.',
    'vs.practiceNote': 'Combate de práctica: no cuenta.',
    'vs.hits': 'golpes',
    'vs.crit': '¡crítico!',
    'vs.gone': 'Ese oponente ya no está en la lista.',
    'vs.kind.code': 'código',
    'vs.kind.url': 'enlace',
    'vs.kind.file': 'archivo',
    'vs.kind.ladder': 'escalera',
    'vs.vs': 'vs',
    'vs.achievement': 'Logro',
    'vs.nameTitle': 'Nombre de jugador de Bug Zoo',
    'vs.namePrompt': 'Tu nombre en la escalera (se muestra a otros jugadores)',
    'vs.namePick': 'Elige un nombre',
    'vs.addTitle': 'Añadir un amigo',
    'vs.addPrompt': 'Pega un código de amigo (BZ1...), un enlace, una ruta de archivo o un nombre de jugador de la escalera',
    'vs.friendAdded': 'Añadido {name}.',
    'vs.friendUpdated': 'Actualizado {name}.',
    'vs.friendSelf': '¡Eres tú!',
    'vs.friendBad': 'No se pudo leer ese amigo.',
    'vs.needCatch': 'Captura un bug primero: tu código de amigo se forma con tus capturas más fuertes.',
    'vs.codeCopied': 'Código de amigo copiado. Envíaselo a un amigo; él lo pega en Añadir amigo.',
    'vs.statusCaught': '$(check) Bug Zoo: ¡capturado {creature}!',
    'vs.notifyCaught': '¡Capturado {creature}! Se unió a tu zoo.',
    'vs.statusSpawned': '$(bug) Bug Zoo: apareció un {creature} salvaje',
    'vs.notifySpawned': '¡Apareció un {creature} salvaje! Arregla el bug y vuelve a ejecutar el comando para capturarlo.',
    'vs.openZoo': 'Abrir el zoo',
    'vs.captureOn': 'Captura de terminal de Bug Zoo activada.',
    'vs.captureOff': 'Captura de terminal de Bug Zoo desactivada.',
    'vs.langTitle': 'Idioma de Bug Zoo',
    'vs.langPlaceholder': 'Elige el idioma de Bug Zoo',
    'vs.langSet': 'Idioma de Bug Zoo: {lang}.',
    'vs.creature': '{name} el {type}',
  },
};

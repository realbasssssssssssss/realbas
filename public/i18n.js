/* สลับภาษา ไทย / English — แปลข้อความที่แสดงบนหน้าจอทั้งหมด (ข้อความต้นฉบับเป็นภาษาไทย) */
(function () {
  'use strict';
  const EX = {
    'หยุด': 'Pause', 'เล่นต่อ': 'Resume', 'เสียง': 'Sound', 'ปิดเสียง': 'Muted', 'ออก': 'Exit', 'ส่ง': 'Send', 'เตะ': 'Kick',
    'จั่ว': 'Draw', 'ผ่าน': 'Pass', 'จบตา': 'End turn', 'ยกเลิก': 'Cancel', 'ยืนยัน': 'Confirm', 'ปิด': 'Close',
    'เชื่อ': 'Believe', 'ไม่เชื่อ!': "Don't believe!", 'ท้า!': 'Challenge!', 'ท้า': 'Challenge', 'ยอมรับ': 'Accept',
    'ออกเลย': 'Leave', 'อยู่ต่อ': 'Stay', 'เข้าแจม': 'Join in', 'เข้าห้อง': 'Enter', 'ห้อง': 'Room', 'บอท': 'Bot',
    'คุณ': 'You', 'ชนะ!': 'Wins!', 'เสมอ': 'Draw', 'ต่อเวลา': 'Overtime', 'ทีมแดง': 'Red team', 'ทีมน้ำเงิน': 'Blue team',
    'จบรอบ': 'Round over', 'ออกจากห้อง': 'Leave room', 'เพิ่มบอท': 'Add bot', '+บอท': '+Bot', 'ผู้เล่น': 'Players',
    'เกม': 'Game', 'ออฟฟิศ': 'Office', 'ชื่อ': 'Name', 'ลง': 'Play', 'ถึงตา': 'Turn', 'เหลือ': 'Left', 'หมดมือ': 'Out of cards',
    'ธรรมดา': 'Classic', 'ใบ': 'cards', 'คน': 'players', 'นาที': 'min', 'ลอบบี้': 'Lobby'
  };
  const P = [
    // ---- ทั่วไป / หน้าแรก
    ['รวมเกมเล่นกับเพื่อนร่วมงานในที่ทำงาน', 'Games to play with your coworkers at the office'],
    ['เกมออฟฟิศ', 'Office Games'], ['สุ่มหน้าตา', 'Randomize look'], ['ใส่ชื่อของคุณก่อนนะ', 'Enter your name first'],
    ['ใส่ชื่อของคุณ', 'Your name'], ['เช่น ฟ้า (บัญชี)', 'e.g. Fah (Accounting)'], ['▶ เริ่มต้น', '▶ Start'],
    ['แชทด้านล่างคุยกับทุกคนที่ออนไลน์ได้เลย', 'Use the chat below to talk to everyone online'],
    ['เลือกเกม', 'Choose a game'], ['สวัสดี', 'Hello'], ['← เปลี่ยนชื่อ', '← Change name'], ['← เมนูเกม', '← Game menu'],
    ['สร้างห้องใหม่', 'Create new room'], ['สร้างห้อง', 'Create room'], ['รหัสผ่านห้อง (ไม่ใส่ก็ได้)', 'Room password (optional)'],
    ['ห้องที่เปิดอยู่ตอนนี้', 'Open rooms'], ['รหัสห้อง', 'Room code'], ['คัดลอกลิงก์ชวนเพื่อน', 'Copy invite link'],
    ['ตั้งค่าห้อง', 'Room settings'], ['▶ เริ่มเกม', '▶ Start game'], ['เริ่มเกม ·', 'Game started ·'],
    ['หยุดเกมชั่วคราว', 'Game paused'], ['กดปุ่มเพื่อเล่นต่อ', 'Press the button to resume'], ['รอหัวห้องกดเล่นต่อ', 'Waiting for the host to resume'],
    ['รอหัวห้องเริ่มรอบใหม่', 'Waiting for the host to start a new round'], ['รอหัวห้องกดเริ่มรอบใหม่…', 'Waiting for the host to start a new round…'],
    ['เปิด/ปิดเสียง', 'Sound on/off'], ['ย่อ/ขยายแชท', 'Collapse/expand chat'], ['ลากขึ้น/ลงเพื่อปรับความสูงแชท', 'Drag up/down to resize chat'],
    ['พิมพ์คุยกันได้เลย แล้วกด Enter…', 'Type a message and press Enter…'],
    ['แชทลอบบี้ (ทุกคนในออฟฟิศเห็น)', 'Lobby chat (everyone in the office sees it)'], ['แชทห้อง', 'Room chat'], ['(ทุกคนในห้องเห็น)', '(everyone in the room sees it)'],
    ['แชทลอบบี้', 'Lobby chat'], ['การเคลื่อนไหว: ปิด', 'Animations: off'], ['การเคลื่อนไหว: เปิด', 'Animations: on'],
    ['คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย', 'Link copied — send it to your friends'], ['คัดลอกลิงก์นี้ส่งให้เพื่อน', 'Copy this link and send it to your friends'],
    ['หลุดการเชื่อมต่อ กำลังต่อใหม่…', 'Disconnected — reconnecting…'], ['หลุดการเชื่อมต่อ', 'Disconnected'], ['ใส่ชื่อก่อน แล้วระบบจะพาเข้าห้องให้', 'Enter your name first and we will take you to the room'],
    ['คุณถูกเชิญออกจากห้อง', 'You were kicked from the room'], ['ถูกเชิญออกจากห้อง', 'was kicked from the room'],
    ['ถึงตาคุณ! — เกมออฟฟิศ', 'Your turn! — Office Games'], ['— เกมออฟฟิศ', '— Office Games'],
    ['· ออนไลน์', '· online'], ['ออนไลน์', 'online'],
    ['เล่นได้ 2–10 คน · เล่นกับบอทได้', '2–10 players · bots allowed'], ['เล่นได้ 2–6 คน · เล่นกับบอทได้', '2–6 players · bots allowed'],
    ['ฟุตบอลตัวกลม 1v1 – 5v5 · เล่นกับบอทได้', 'Round-player football 1v1 – 5v5 · bots allowed'],
    ['ยังไม่มีห้อง — สร้างห้องใหม่แล้วชวนเพื่อนได้เลย', 'No rooms yet — create one and invite your friends'],
    ['กำลังเล่น (รอจบรอบ)', 'Playing (wait for the round to end)'], ['จบรอบ — เข้าแจมรอบหน้าได้', 'Round over — join the next one'],
    ['ห้องเต็มแล้ว', 'The room is full'], ['ห้องเต็ม', 'Full'], ['รอผู้เล่น', 'Waiting for players'], ['ใส่รหัส', 'Enter code'],
    ['ล็อกอยู่', 'is locked'], ['รหัสผ่านห้อง', 'Room password'], ['รหัสห้องต้องมี 4 ตัวอักษร', 'Room code must be 4 characters'],
    ['กำลังเล่นอยู่ ออกจากห้องจริงหรือ?', 'The game is in progress. Really leave the room?'],
    ['เกมใหม่', 'New game'], ['เร็ว ๆ นี้', 'Coming soon'], ['พร้อมแล้ว! กดเริ่มเกมได้เลย', 'Ready! Press Start'], ['กดเริ่มได้เลย — ที่ว่างในทีมบอทจะเติมให้เอง', 'Press Start — empty team slots are filled by bots'],
    ['กองจั่ว (กดเพื่อจั่ว)', 'Draw pile (click to draw)'], ['สลับเรียงตามเลข / ตามสี', 'Toggle sort by number / color'], ['ฟาร์ม', 'Farm '], ['ห้อง', 'Room'], ['นาที', 'min'], ['คน', 'players'],
    // ---- WEREWOLF
    ['เลือกเหยื่อ','Choose a victim'],['กัดได้ 2 คน','Can bite 2'],['รอคนอื่น…','Waiting for others…'],['เลือกคนปิดปาก','Choose who to silence'],['เลือก 2 คน','Choose 2 players'],['เลือกคนที่จะปกป้อง','Choose who to protect'],['เลือกคนที่จะส่อง','Choose who to inspect'],['เลือกคนที่จะยิง','Choose who to shoot'],['เลือกคนที่จะโหวต','Choose who to vote for'],['คุยกันในแชท','Talk in the chat'],['กลางคืน… หลับตา','Night… eyes closed'],['นับคะแนน…','Counting votes…'],['นายพรานกำลังยิง…','The hunter is shooting…'],['คุณตายแล้ว','You are dead'],
    ['ชู่ว', 'Hush'], ['นายพราน', 'Hunter'], ['ยาจกชนะ!', 'The beggar wins!'], ['จบเกม — ยาจกชนะ!', 'Game over — the beggar wins!'], ['เป็นยาจก! ถูกโหวตประหาร — ยาจกชนะคนเดียว', 'is the beggar! Voted out — the beggar wins alone'],
    ['คืนแรกจับคู่ ตายตามกัน', 'Pairs 2 lovers on night 1'], ['ปกป้อง 1 คน ตัวเองก็ได้ ห้ามซ้ำ 2 คืน', 'Guards 1 player (self too), not twice in a row'], ['ตาย → คืนถัดไปหมาป่าฆ่าได้ 2 คน', 'If killed, the wolves kill 2 next night'], ['ให้ตัวเองโดนโหวต = ชนะคนเดียว', 'Get voted out = win alone'], ['ไม่มีสกิล ช่วยโหวตหาหมาป่า', 'No skill — help vote for the wolves'],
    ['คืนแรกเลือกผู้เล่น 2 คนให้เป็นคู่รักกัน ถ้าคนใดคนหนึ่งตาย อีกคนจะตายตามทันที (ถ้าคู่รักอยู่คนละฝั่งและเหลือกันสองคนสุดท้าย คู่รักชนะ)', 'On night 1 choose 2 players to be lovers. If either dies, the other dies at once (if the lovers are on opposite sides and are the last two alive, the lovers win)'],
    ['ตื่นมาตอนกลางคืนเพื่อเลือกปกป้องผู้เล่น 1 คนไม่ให้โดนหมาป่าฆ่าในคืนนั้น ปกป้องตัวเองได้ และไม่สามารถปกป้องซ้ำ 2 คืนติดกัน', 'Wake at night to protect 1 player from being killed by the wolves that night. You may protect yourself, but not the same player two nights in a row'],
    ['อยู่ฝั่งหมาป่า ถ้าลูกหมาป่าตาย แม่ของมัน (หมาป่า) จะฆ่าได้ 2 คนในคืนถัดไป', 'On the wolves\' side. If the cub dies, its mother (the wolves) can kill 2 players next night'], ['ทำยังไงก็ได้ให้ตัวเองโดนโหวตประหาร ถ้าสำเร็จ ยาจกจะชนะคนเดียวทันที', 'Do whatever it takes to get yourself voted out. If you succeed, the beggar wins alone at once'],
    ['ชาวบ้านธรรมดา ไม่มีสกิล ช่วยกันคุยและโหวตหาตัวหมาป่า', 'An ordinary villager with no skill — talk and vote to find the wolves'], ['เลือกคนที่จะปกป้องคืนนี้ (ตัวเองก็ได้ แต่ห้ามซ้ำคนเดิม 2 คืนติด)', 'Choose who to protect tonight (yourself is fine, but not the same player two nights in a row)'],
    ['ห้ามปกป้องคนเดิมสองคืนติดกัน', 'You cannot protect the same player two nights in a row'], ['ถูกนายพรานยิงตาย', 'was shot by the hunter'], ['นายพรานกำลังเลือกคนที่จะยิง', 'The hunter is choosing someone to shoot'],
    ['คิวปิด', 'Cupid'], ['บอดี้การ์ด', 'Bodyguard'], ['ลูกหมาป่า', 'Wolf cub'], ['ยาจก', 'Beggar'],
    ['คืนแรกจับคู่รัก 2 คน ตายตามกัน', 'Pairs 2 lovers on night 1'], ['ปกป้อง 1 คน รับกัดแทนจนตาย', 'Guards 1 player, dies in their place'], ['ถ้าตาย คืนถัดไปหมาป่ากัด 2 คน', 'If killed, the wolves bite 2 next night'], ['ถูกโหวตไม่ตาย แต่เสียสิทธิ์โหวต', 'Survives a vote but loses their vote'],
    ['คืนแรกเลือกคู่รัก 2 คน ถ้าคนหนึ่งตายอีกคนตรอมใจตายตาม ถ้าคู่รักอยู่คนละฝั่งและเหลือกันสองคนสุดท้าย คู่รักชนะ', 'On night 1 choose 2 lovers. If one dies the other dies of heartbreak. If the lovers are on opposite sides and are the last two alive, the lovers win'],
    ['ทุกคืนปกป้อง 1 คน (ไม่ใช่ตัวเอง) ถ้าหมาป่ากัดคนนั้น บอดี้การ์ดจะตายแทนและคนที่ถูกปกป้องรอด', 'Each night guard 1 player (not yourself). If the wolves bite them, the bodyguard dies instead and the guarded player survives'],
    ['อยู่ฝั่งหมาป่า ถ้าลูกหมาป่าตาย คืนถัดไปหมาป่าจะกัดได้ 2 คน', "On the wolves' side. If the cub dies, the wolves can bite 2 players next night"], ['ถ้าถูกโหวตประหาร จะไม่ตาย แต่ถูกเปิดบทบาทและเสียสิทธิ์โหวตตลอดเกม', 'If voted out, survives but is revealed and loses their vote for the rest of the game'],
    ['กลางคืน · คิวปิดจับคู่', 'Night · Cupid pairs lovers'], ['กลางคืน · บอดี้การ์ดปกป้อง', 'Night · the bodyguard guards'], ['เลือกคู่รัก 2 คน (กดการ์ดผู้เล่น 2 คน)', 'Choose 2 lovers (click 2 player cards)'], ['จับคู่แล้ว รอคนอื่น…', 'Paired — waiting for the others…'], ['จับคู่', 'Pair'],
    ['เลือกคนที่จะปกป้องคืนนี้ (ถ้าหมาป่ากัดคนนั้น คุณจะตายแทน)', 'Choose who to guard tonight (if the wolves bite them, you die instead)'], ['ปกป้อง', 'Guard'], ['ลูกหมาป่าตายไปแล้ว — คืนนี้กัดได้ 2 คน (เลือกทีละคน)', 'The cub is dead — tonight you can bite 2 players (pick one at a time)'],
    ['(เลือกคนที่ถูกกัด)', '(pick a bitten player)'], ['คู่รัก:', 'Lovers:'], ['คู่รักชนะ!', 'The lovers win!'], ['คู่รัก', 'Lovers'], ['ตรอมใจตายตามคู่รัก', 'died of a broken heart after their lover'], ['ปกป้องเป้าหมายจนตัวเองตาย', 'died protecting their target'],
    ['คิวปิดจับคู่รักเรียบร้อยแล้ว', 'Cupid has paired the lovers'], ['เป็นยาจก! ไม่ถูกประหาร แต่ถูกเปิดบทบาทและเสียสิทธิ์โหวต', 'is a beggar! Not executed, but revealed and loses their vote'], ['ยาจกเสียสิทธิ์โหวตแล้ว', 'The beggar has lost their vote'], ['เลือกคู่รัก 2 คน', 'Choose 2 lovers'], ['จบเกม — คู่รักชนะ!', 'Game over — the lovers win!'],
    ['หมอรักษา', 'Doctor'], ['ทุกคืนกัดชาวบ้าน 1 คน', 'Bites 1 villager each night'], ['ปิดปาก 1 คน พูดไม่ได้ 1 วัน', 'Silences 1 player for a day'], ['ส่องดูว่าใครเป็นหมาป่า', 'Checks if someone is a wolf'],
    ['ป้องกัน 1 คนจากหมาป่า', 'Protects 1 player from the wolves'], ['ตายแล้วยิงตามไป 1 คน', 'When killed, shoots 1 player'], ['ยาชุบชีวิต 1 ยาพิษ 1', '1 healing potion, 1 poison'], ['โหวตไล่หมาป่า', 'Votes out the wolves'],
    ['ผู้ปิดปาก', 'Silencer'], ['อยู่ฝั่งหมาป่า ทุกคืนเลือกปิดปาก 1 คน วันถัดไปพูดไม่ได้ (โหวตได้)', 'On the wolves\' side. Each night, silence 1 player — they cannot speak the next day (they can still vote)'],
    ['กลางคืน · ผู้ปิดปากเลือกเหยื่อ', 'Night · the silencer picks a target'], ['เลือกคนที่จะปิดปากในวันพรุ่งนี้', 'Choose who to silence tomorrow'], ['ปิดปาก', 'Silence'],
    ['ถูกปิดปากตลอดวันนี้ (พูดไม่ได้ แต่โหวตได้)', 'is silenced for the whole day (cannot speak, can still vote)'], ['ถูกปิดปากตลอดวันนี้', 'is silenced for the whole day'], ['คุณถูกปิดปากวันนี้ พูดไม่ได้', 'You are silenced today and cannot speak'],
    ['บทบาท (กดการ์ดเพื่อเปิด/ปิด)', 'Roles (click a card to turn it on/off)'],
    ['เกมหมาป่า 4–12 คน · เลือกบทบาทได้ · เล่นกับบอทได้', 'Werewolf 4–12 players · choose roles · bots allowed'], ['จำนวนผู้เล่น (ไม่ครบจะมีบอทเติมให้)', 'Number of players (bots fill the gaps)'],
    ['จำนวนหมาป่า', 'Number of wolves'], ['บทบาทพิเศษ (ที่เหลือเป็นชาวบ้าน)', 'Special roles (the rest are villagers)'], ['เวลาคุยตอนกลางวัน', 'Daytime discussion time'], ['วินาที', 'sec'],
    ['บทบาทมากกว่าจำนวนผู้เล่น ลดบทบาทหรือเพิ่มจำนวนผู้เล่น', 'More roles than players — remove roles or add players'], ['บทบาทมากกว่าจำนวนผู้เล่น', 'More roles than players'],
    ['หมาป่ามากเกินไป (ต้องน้อยกว่าครึ่งหนึ่งของผู้เล่น)', 'Too many wolves (must be fewer than half of the players)'], ['หมาป่ามากเกินไป (ต้องน้อยกว่าครึ่งหนึ่ง)', 'Too many wolves (must be fewer than half)'],
    ['ผู้เล่นในห้องมากกว่าจำนวนที่ตั้งไว้', 'More players in the room than the set number'], ['เลือกจำนวนผู้เล่นกับบทบาท แล้วกดเริ่ม — คนไม่ครบบอทจะเติมให้', 'Pick the player count and roles, then press Start — bots fill any gaps'],
    ['รอหัวห้องกดเริ่มเกม…', 'Waiting for the host to start…'], ['ตอนกลางคืนห้ามคุย', 'No talking at night'], ['ห้ามป้องกันคนเดิมสองคืนติดกัน', 'You cannot protect the same person two nights in a row'], ['เลือกเป้าหมายไม่ถูก', 'Invalid target'],
    ['ทุกคืนเลือกกัดชาวบ้านร่วมกับพวก ชนะเมื่อจำนวนเท่าหรือมากกว่าชาวบ้าน', 'Each night the wolves choose a villager to bite. Wolves win when they equal or outnumber the villagers'],
    ['ไม่มีพลังพิเศษ ช่วยกันคุยและโหวตไล่หมาป่า', 'No special power — talk and vote out the wolves together'], ['ทุกคืนส่องดู 1 คนว่าเป็นหมาป่าหรือไม่', 'Each night, look at 1 player to see whether they are a wolf'],
    ['ทุกคืนป้องกัน 1 คนจากหมาป่า (ห้ามคนเดิมสองคืนติด)', 'Each night, protect 1 player from the wolves (not the same player two nights in a row)'], ['ถ้าตาย ได้ยิงอีก 1 คนให้ตายตามไป', 'When killed, shoot 1 more player to take them down too'],
    ['ยาชุบชีวิต 1 ขวด ยาพิษ 1 ขวด ใช้ได้อย่างละครั้งทั้งเกม', '1 healing potion and 1 poison, each usable once per game'],
    ['หมาป่าชนะ!', 'Werewolves win!'], ['ชาวบ้านชนะ!', 'Villagers win!'], ['หมาป่า', 'Werewolf'], ['ชาวบ้าน', 'Villager'], ['หมอดู', 'Seer'], ['พราน', 'Hunter'], ['แม่มด', 'Witch'], ['หมอ', 'Doctor'],
    ['กลางคืน · หมาป่ากำลังล่า', 'Night · the wolves are hunting'], ['กลางคืน · หมอดูส่อง', 'Night · the seer looks'], ['กลางคืน · หมอป้องกัน', 'Night · the doctor protects'], ['กลางคืน · แม่มดตื่น', 'Night · the witch wakes'],
    ['กลางวัน · คุยกัน', 'Day · discussion'], ['โหวตประหารผู้ต้องสงสัย', 'Vote to execute a suspect'], ['โหวตประหาร', 'Execution vote'], ['ผลโหวต:', 'Vote result:'], ['พรานกำลังยิง', 'The hunter is shooting'], ['จบเกม —', 'Game over —'], ['จบเกม', 'Game over'],
    [' · วันที่ ', ' · Day '], ['กลางคืน — ทุกคนหลับตา', 'Night — everyone closes their eyes'], ['กลางคืน', 'Night'], ['กลางวัน วันที่', 'Day'], ['กลางวัน', 'Day'], ['รุ่งเช้าแล้ว…', 'Dawn has come…'], ['รุ่งเช้า — เมื่อคืนไม่มีใครตาย', 'Dawn — nobody died last night'],
    ['รุ่งเช้า —', 'Dawn —'], ['รุ่งเช้า', 'Dawn'], ['คืนที่', 'Night'], ['วันที่', 'Day'], [' = ไม่ใช่หมาป่า', ' = not a wolf'], [' = หมาป่า', ' = a wolf'], ['ชุบชีวิต', 'Heal'], ['ยาพิษ', 'Poison'],
    ['กลางคืน… ทุกคนหลับตา รอให้ผู้มีบทบาทตื่นมาทำหน้าที่', 'Night… everyone is asleep, waiting for the role holders to wake up'], ['นับคะแนนโหวต…', 'Counting votes…'], ['พรานกำลังเลือกคนที่จะยิง…', 'The hunter is choosing someone to shoot…'],
    ['คุณตายแล้ว — ดูคนอื่นเล่นต่อ (คุยกับผู้ตายคนอื่นได้ในแชท)', 'You are dead — watch the others play (you can chat with the other dead)'], ['คุณตายแล้ว!', 'You are dead!'], ['คุณตายแล้ว', 'You are dead'],
    ['เลือกคนที่จะกัดคืนนี้ (คุยกับพวกในแชทได้)', 'Choose who to bite tonight (you can chat with your pack)'], ['กัด', 'Bite'], ['ส่องเสร็จแล้ว รอคนอื่น…', 'Done looking — waiting for the others…'], ['เลือกคนที่จะส่องดู', 'Choose who to look at'], ['ส่อง', 'Look'], ['ข้าม', 'Skip'],
    ['เลือกแล้ว รอคนอื่น…', 'Chosen — waiting for the others…'], ['เลือกคนที่จะป้องกันคืนนี้', 'Choose who to protect tonight'], ['(ห้ามซ้ำคนเดิม)', '(not the same person)'], ['ป้องกัน', 'Protect'],
    ['ตัดสินใจแล้ว รอคนอื่น…', 'Decided — waiting for the others…'], ['เมื่อคืนหมาป่ากัด', 'Last night the wolves bit'], ['เมื่อคืนไม่มีใครถูกกัด', 'Nobody was bitten last night'], ['ใช้ยาชุบชีวิต', 'Use healing potion'], ['ใช้ยาพิษ (เลือกเป้าหมาย)', 'Use poison (pick a target)'], ['ไม่ใช้', 'Do not use'],
    ['เลือกคนที่จะยิงตามไป', 'choose who to shoot'], ['เลือกคนที่คิดว่าเป็นหมาป่าแล้วกดโหวต', 'Pick who you think is a wolf and press Vote'], ['คุณงดออกเสียง', 'You abstained'], ['คุณโหวต', 'You voted for'], ['โหวต', 'Vote'], ['งดออกเสียง', 'Abstain'],
    ['ยิง', 'Shoot'], ['ไม่ยิง', 'Do not shoot'], ['ช่วยกันคุยหาตัวหมาป่าในแชทด้านล่าง', 'Talk in the chat below to find the wolves'], ['พร้อมโหวต', 'Ready to vote'], ['พร้อมแล้ว', 'Ready'],
    ['เริ่มเกมหมาป่า', 'Werewolf game started'], ['เริ่มเกม', 'Game started'], ['เริ่มโหวตประหาร', 'The execution vote begins'], ['โหวตเสมอหรือไม่มีใครถูกเลือก — ไม่มีใครถูกประหาร', 'Tie or nobody chosen — no one is executed'],
    ['ถูกหมาป่ากัดตาย', 'was killed by the wolves'], ['ถูกวางยาพิษตาย', 'was poisoned'], ['ถูกโหวตประหาร', 'was voted out'], ['ถูกพรานยิงตาย', 'was shot by the hunter'], ['— เป็น', '— role: '], ['พรานกำลังเลือกคนที่จะยิง', 'The hunter is choosing someone to shoot'],
    ['เมื่อคืนไม่มีใครตาย', 'nobody died last night'], ['ตาย', 'died'], ['หลับตา', 'sleepy'],
    // ---- ตัวละคร
    ['สีผิว', 'Skin'], ['ทรงผม', 'Hair'], ['สีผม', 'Hair color'], ['สีเสื้อ', 'Shirt color'], ['ลายเสื้อ', 'Shirt style'], ['เครื่องประดับ', 'Accessory'],
    ['โล้น', 'Bald'], ['ผมสั้น', 'Short'], ['ผมยาว', 'Long'], ['ผมตั้ง', 'Spiky'], ['มวยผม', 'Bun'], ['โมฮอว์ก', 'Mohawk'], ['หยิกฟู', 'Curly'],
    ['เสื้อยืด', 'T-shirt'], ['ลายทาง', 'Striped'], ['คอวี', 'V-neck'], ['ฮู้ด', 'Hoodie'], ['ไม่มี', 'None'], ['แว่นตา', 'Glasses'],
    ['แว่นกันแดด', 'Sunglasses'], ['หมวกแก๊ป', 'Cap'], ['มงกุฎ', 'Crown'], ['หูฟัง', 'Headphones'], ['สร้อยคอ', 'Necklace'],
    // ---- ห้องรอ UNO
    ['โหมดเกม', 'Game mode'], ['แอบดูด้านหลังการ์ดคนอื่น', "Peek at the backs of others' cards"], ['จำนวนใบแรกที่แจก', 'Starting hand size'],
    ['ลืมพูด UNO แล้วถูกจับ', 'Penalty for forgetting UNO'], ['ทิศทางการเล่น (เริ่มต้น)', 'Play direction (start)'], ['ทิศทางการเล่น (หัวห้องเล่นก่อนเสมอ)', 'Play direction (host always starts)'],
    ['↻ ตามเข็มนาฬิกา', '↻ Clockwise'], ['↺ ทวนเข็มนาฬิกา', '↺ Counter-clockwise'], ['↻ วนขวา (ตามเข็ม)', '↻ Turn right (clockwise)'], ['↺ วนซ้าย (ทวนเข็ม)', '↺ Turn left (counter-clockwise)'],
    ['หัวห้องเป็นคนตั้งค่า', 'Only the host can change settings'], ['หัวห้อง', 'Host'], ['(คุณ)', '(you)'], ['ออฟไลน์', 'Offline'], ['[บอท]', '[Bot]'],
    ['↻ วนขวา', '↻ Right'], ['↺ วนซ้าย', '↺ Left'], ['เฉพาะหัวห้องเท่านั้น', 'Host only'],
    // ---- COUP
    ['COUP · ห้อง', 'COUP · room'], ['HAXBALL · ห้อง', 'HAXBALL · room'], ['เกมโค่นอำนาจ', 'Game of Influence'],
    ['เก็บภาษี +2 เหรียญ', 'Collect tax +2 coins'], ['ขโมย 2 เหรียญ · บล็อกการขโมย', 'Steal 2 coins · blocks stealing'], ['เปลี่ยนการ์ดอาชีพ', 'Exchange role cards'],
    ['จ่าย 3 เหรียญ ฆ่า 1 คน', 'Pay 3 coins to assassinate 1 player'], ['บล็อกแอสซาซิน', 'Blocks the Assassin'],
    ['ฟาร์มเหรียญ +2 ต่อตา', 'Farm coins +2 per turn'], ['ขโมยเหรียญ 2 / บล็อกการขโมย', 'Steal 2 coins / block stealing'], ['เปลี่ยนอาชีพ (สลับการ์ด)', 'Exchange roles (swap cards)'],
    ['ฟาร์ม 2 เหรียญ (ดู๊ก)', 'Farm 2 coins (Duke)'], ['ฟาร์ม 1 เหรียญ', 'Farm 1 coin'], ['ฟาร์ม +1', 'Farm +1'], ['ดู๊ก +2', 'Duke +2'], ['กัปตัน ขโมย 2', 'Captain steals 2'],
    ['บัง เปลี่ยนอาชีพ', 'Ambassador exchange'], ['แอสซาซิน ฆ่า (3 เหรียญ)', 'Assassin kills (3 coins)'], ['ฆ่าเลือกการ์ด (7 เหรียญ)', 'Coup (7 coins)'], ['ฆ่าเลือกการ์ด', 'Coup'],
    ['เปลี่ยนอาชีพ (บัง)', 'Exchange (Ambassador)'], ['ขโมย', 'Steal'], ['ฆ่า', 'Kill'], ['ดู๊ก', 'Duke'], ['กัปตัน', 'Captain'], ['แอสซาซิน', 'Assassin'], ['นางฟ้า', 'Contessa'], ['บัง', 'Ambassador'],
    ['กองกลาง', 'Deck'], ['กำลังคิด…', 'Thinking…'], ['ออกแล้ว', 'Left'], ['ตกรอบ', 'Eliminated'], ['คุณตกรอบแล้ว', 'You are eliminated'],
    ['ต้องฆ่าเลือกการ์ด!', 'You must Coup!'], ['ถึงตาคุณ!', 'Your turn!'], ['จริงไหม?', 'really?'], [' มี ', ' has '], ['จะขโมยคุณ', 'is stealing from you'], ['จะฆ่าคุณ', 'is going to kill you'],
    ['— บล็อกไหม?', '— block?'], ['เลือกการ์ดที่จะเสีย', 'Choose a card to lose'], ['เลือกการ์ดของ', 'Pick a card of'], ['ที่จะฆ่า', 'to kill'], ['เลือกเก็บ', 'Keep'],
    ['คลิกผู้เล่นที่จะ', 'Click the player to '], ['บล็อก (อ้างว่าเป็น', 'Block (claim to be '], ['บล็อก', 'Block'], ['ในมือคุณ', 'In your hand'], ['จากกองกลาง', 'From the deck'],
    ['เก็บได้', 'Keep up to'], ['— กดการ์ดเพื่อเก็บ/ทิ้ง (ไม่เปลี่ยนก็ได้)', '— tap cards to keep/discard (you may keep your own)'], ['รอคนอื่น…', 'Waiting for others…'],
    ['ชนะเกม COUP!', 'wins the COUP game!'], ['ครองอำนาจ ชนะเกม!', 'seized power and wins the game!'], ['· ชนะ', '· wins'], ['เล่นอีกรอบ', 'Play again'], ['▶ เล่นอีกรอบ', '▶ Play again'],
    ['เสียการ์ด', 'lost a card'], [' 1 ใบ', ' 1 card'], ['ท้า —', 'challenged —'], ['มีจริง!', 'Truth!'], ['โกหก!', 'Bluff!'], [' จริง', ' really has it'],
    ['จ่าย 7 ฆ่า', 'paid 7 to coup'], [' จาก ', ' from '], ['ออกจากเกม', 'left the game'], ['ต้องมี', 'Need'], ['เหรียญ', 'coins'],
    ['มี 10 เหรียญขึ้นไป ต้องใช้ฆ่าเลือกการ์ด', 'With 10+ coins you must Coup'], ['เลือกการ์ดไม่ถูก', 'Invalid card choice'], ['ไม่ใช่ตาคุณเลือก', 'It is not your turn to choose'],
    ['ทำแบบนี้ไม่ได้ตอนนี้', 'You cannot do that now'], ['ทำแบบนี้ไม่ได้', 'You cannot do that'], ['ยังไม่ได้เริ่มเกม', 'The game has not started'], ['เกมหยุดชั่วคราวอยู่', 'The game is paused'],
    ['แล้วถูกข้ามตา', 'and is skipped'],
    // ---- HAXBALL
    ['ฟุตบอลตัวกลม', 'Round football'], ['ทีมแดง', 'Red team'], ['ทีมน้ำเงิน', 'Blue team'], ['เตรียมพร้อม…', 'Get ready…'], ['ย้ายทีม', 'Switch team'], ['เชิญออก', 'Kick'],
    ['ขนาดทีม (สนามใหญ่ขึ้นตามจำนวนคน)', 'Team size (the field grows with player count)'], ['ลูกบอล', 'Ball'], ['ลูกเล็ก', 'Small'], ['ลูกใหญ่', 'Big'], ['เวลาแข่ง', 'Match time'],
    ['W A S D เดิน · Space เตะ/ส่ง · ทีมที่ไม่ครบ บอทจะเติมให้อัตโนมัติ', 'W A S D move · Space kick/pass · bots fill any empty slots automatically'],
    ['เริ่มแมตช์', 'Match start'], ['นาที)', 'min)'], ['จบแมตช์ เสมอ', 'Match over — draw'], ['เสมอ! ต่อเวลา 1 นาที ประตูทองคำ', 'Draw! 1 minute of golden-goal overtime'],
    ['เข้าประตูตัวเอง ', 'own goal '], ['ประตู!', 'GOAL!'], ['มีคนเกิน', 'too many players, max'], ['(ย้ายทีมหรือเอาบอทออก)', '(move players or remove bots)'],
    // ---- UNO
    ['ธรรมดา', 'Classic'], ['อันดับ', 'Rank'], ['ออโต้', 'Auto'], ['จับ UNO!', 'Catch UNO!'], ['เรียงเลข', 'Sort by number'], ['เรียงสี', 'Sort by color'],
    ['คุณหมดมือแล้ว ได้อันดับ', 'You are out of cards — rank'], ['— ดูคนอื่นเล่นต่อ', '— watch the others play on'], ['ลงการ์ด + ต่อ หรือจั่ว', 'Play a + card to stack, or draw'],
    ['ต้องลงการ์ด + หรือจั่ว', 'must play a + card or draw'], ['ตัดสินใจ: ท้า หรือ ยอมรับ', 'Decide: challenge or accept'], ['รอ', 'Waiting for'], ['ตัดสินใจ…', 'to decide…'],
    ['ลงเลขเดียวกันต่อได้ หรือกด', 'You may play the same number again, or press'], ['จั่วได้ใบที่ลงได้! ลงใบนั้น หรือกด', 'You drew a playable card! Play it, or press'],
    ['ถึงตาคุณ! เลือกการ์ดหรือจั่ว', 'Your turn! Pick a card or draw'], ['ใส่คุณ!', 'on you!'], ['ท้า: ถ้า', 'Challenge: if'], ['แอบมีสีเดิมในมือ', 'was hiding the previous color,'],
    ['จั่ว 4 ใบ แต่ถ้าไม่ได้โกง คุณจั่วเพิ่มอีก 2 ใบ', 'draws 4 cards — but if they did not cheat, you draw 2 extra cards'], ['ยอมรับ: คุณ', 'Accept: you'], ['จั่วจนได้สีที่เลือก', 'draw until the chosen color'],
    ['จั่ว ', 'draw '], [' ใบ', ' cards'], ['หมดมือ', 'out of cards'], ['เหลือ', 'left:'], ['จั่วไม่ได้ตอนนี้', 'You cannot draw now'], ['ยังไม่ถึงตาคุณ', 'It is not your turn yet'],
    ['ต้องเลือก ท้า หรือ ยอมรับ ก่อน', 'Choose Challenge or Accept first'], ['ลงต่อได้เฉพาะเลข/การ์ดแบบเดียวกัน หรือกด จบตา', 'You may only play the same number/card again, or press End turn'],
    ['หลังจั่ว เล่นได้เฉพาะใบที่เพิ่งจั่ว หรือกด', 'After drawing you may only play the card you just drew, or press'], ['ใบนี้ลงไม่ได้ — ต้องสีหรือเลข/สัญลักษณ์ตรงกับใบบนสุด', 'You cannot play this card — color or number/symbol must match the top card'],
    ['ผ่านไม่ได้ในตอนนี้', 'You cannot pass now'], ['เริ่มรอบที่', 'Round'], ['(โหมดธรรมดา', '(Classic mode'], ['โหมดธรรมดา', 'Classic mode'], ['โหมด Flip', 'Flip mode'], ['· ลืมพูด UNO จั่ว', '· forgetting UNO = draw'],
    ['เริ่มก่อน', 'goes first'], ['ชนะรอบนี้! (ชนะรวม', 'wins this round! (total wins:'], ['ครั้ง)', ')'], ['ครั้ง', 'times'], ['เกมยังไม่เริ่ม', 'The game has not started'], ['ต้องรอตอบรับการ์ดจั่วก่อน', 'You must respond to the draw card first'],
    ['ไม่พบการ์ดใบนี้', 'Card not found'], ['ลงต่อได้เฉพาะการ์ด + หรือกด จบตา', 'You may only play a + card, or press End turn'], ['ต้องเลือกสีก่อน', 'Choose a color first'],
    ['หลังจั่ว เล่นได้เฉพาะใบที่เพิ่งจั่วมา', 'After drawing you may only play the card you just drew'], ['เลือกการ์ดซ้ำกัน', 'Duplicate card selected'], ['ไม่พบการ์ดที่เลือก', 'Selected card not found'],
    ['ลงพร้อมกันได้เฉพาะการ์ดเลข การ์ด + การ์ดข้ามตา หรือการ์ดกลับทิศที่เหมือนกัน', 'You can only play together number cards, + cards, Skip cards or Reverse cards that match'],
    ['หลังจั่ว ต้องลงใบที่เพิ่งจั่วเป็นใบแรก', 'After drawing, the card you just drew must be played first'], ['เล่นการ์ดใบนี้ไม่ได้', 'You cannot play this card'], ['ไม่มีใบไหนลงได้เลย', 'None of those cards can be played'],
    ['ใบพร้อมกัน', 'cards at once'], ['หมดมือ ได้อันดับ', 'is out of cards — rank'], ['ลง +', 'plays +'], ['— กองรวม +', '— stack total +'], ['กลับทิศทาง ↺', 'reversed direction ↺'], ['กลับทิศทาง', 'reversed direction'], ['(ทิศเดิม)', '(original direction)'],
    ['ใบ และถูกข้ามตา', 'cards and is skipped'], ['กองจั่วหมดแล้ว ข้ามตา', 'The draw pile is empty — turn skipped'], ['จั่วแล้วเล่นไม่ได้ ผ่านตา', 'drew and could not play — passes'], ['ข้ามตา', 'skipped'],
    ['ข้ามทุกคน เล่นต่อ!', 'skips everyone — plays again!'], ['พลิก! ตอนนี้เป็นด้าน', 'flipped! Now the'], ['สว่าง', 'light side'], ['มืด', 'dark side'], ['(ใบบนสุดเป็น Wild — ใครจะลงอะไรก็ได้', '(top card is Wild — anything can be played'],
    ['เปลี่ยนสีเป็น', 'changed the color to'], ['เลือกสี', 'chose'], ['กด UNO เล่น โดนจั่วเพิ่ม 1 ใบ', 'pressed UNO too early — draws 1 extra card'], ['เรียก UNO!', 'called UNO!'], ['ไม่มีใครให้จับ', 'Nobody to catch'], ['จับไม่ได้', 'Cannot catch'],
    ['จับได้!', 'caught them!'], ['ลืมเรียก UNO จั่ว', 'forgot to call UNO — draws'], ['ไม่มีอะไรให้ตอบ', 'Nothing to answer'], ['ท้าสำเร็จ!', 'Challenge succeeded!'], ['มีสี', 'had the color'], ['อยู่ในมือ จั่ว 4 ใบ —', 'in hand and draws 4 cards —'],
    ['เล่นต่อได้เลย', 'play continues'], ['ท้าพลาด!', 'Challenge failed!'], ['ไม่ได้โกง —', 'did not cheat —'], ['จั่วเพิ่ม 2 ใบ', 'draws 2 extra cards'],
    ['หายไปนาน — ให้บอทเล่นแทนชั่วคราว (กลับมากดอะไรก็ได้เพื่อรับช่วงคืน)', 'was away too long — a bot plays for them for now (press anything to take over again)'], ['หมดเวลา', 'ran out of time'],
    ['เป็นหัวห้องคนใหม่', 'is the new host'], ['เกินเวลา', 'timed out'],
    ['สับกองทิ้งกลับมาเป็นกองจั่ว', 'The discard pile was reshuffled into the draw pile'],
    // ---- ห้อง/ระบบ
    ['ใส่ชื่อก่อนนะ', 'Enter your name first'], ['คุณอยู่ในห้องอยู่แล้ว', 'You are already in a room'], ['ถูกสร้างโดย', 'was created by'], ['ไม่พบห้องนี้ ลองเช็กรหัสอีกครั้ง', 'Room not found — check the code again'],
    ['รหัสผ่านห้องไม่ถูกต้อง', 'Wrong room password'], ['ห้องนี้ล็อกอยู่ ใส่รหัสผ่านก่อนนะ', 'This room is locked — enter the password'], ['ห้องนี้กำลังเล่นอยู่ รอจบรอบก่อนนะ', 'This room is playing — wait for the round to end'],
    ['กำลังเล่นอยู่', 'is playing'], ['ตั้งค่าตอนกำลังเล่นไม่ได้', 'Cannot change settings during a game'], ['การ์ดไม่พอแจก (', 'Not enough cards to deal ('], ['คน ×', 'players ×'], ['ใบ) ลดจำนวนใบเริ่มต้นลงหน่อยนะ', 'cards) — lower the starting hand size'],
    ['เข้าห้อง', 'joined the room'], ['เพิ่ม', 'added'], ['เล่นต่อ', 'resumed'], ['ผู้เล่น', 'Player'],
    [' หยุดเกมชั่วคราว', ' paused the game'], ['ชนะ', 'wins'],
    // ---- บอท / ชื่อ
    ['บอทข้าวเหนียว', 'Bot Sticky Rice'], ['บอทส้มตำ', 'Bot Papaya Salad'], ['บอทหมูปิ้ง', 'Bot Grilled Pork'], ['บอทไข่เจียว', 'Bot Omelet'], ['บอทชาเย็น', 'Bot Thai Tea'],
    ['บอทโอเลี้ยง', 'Bot Oliang'], ['บอทปลาทู', 'Bot Mackerel'], ['บอทมะม่วง', 'Bot Mango'], ['บอทลอดช่อง', 'Bot Lod Chong'], ['บอทกะเพรา', 'Bot Basil'],
    ['บอทหลับตา', 'Bot Sleepy'], ['บอททุเรียน', 'Bot Durian'], ['บอทน้ำพริก', 'Bot Chili Dip'], ['บอท', 'Bot '],
    // ---- สี / การ์ด
    ['เขียวน้ำทะเล', 'Teal'], ['แดง', 'Red'], ['เหลือง', 'Yellow'], ['เขียว', 'Green'], ['น้ำเงิน', 'Blue'], ['ชมพู', 'Pink'], ['ส้ม', 'Orange'], ['ม่วง', 'Purple'],
    ['คนถัดไปลง + ต่อ หรือจั่ว', 'next player plays a + card or draws'], ['เปลี่ยนสี + 4 คนถัดไปลง + ต่อ หรือจั่ว', 'Change color + 4 — next player plays a + card or draws'], ['เปลี่ยนสี + 2 คนถัดไปลง + ต่อ หรือจั่ว', 'Change color + 2 — next player plays a + card or draws'],
    ['เปลี่ยนสี + คนถัดไปจั่วจนได้สีนั้น', 'Change color + next player draws until that color'], ['กลับทิศทาง (ลงซ้อนได้ กลับทีละครั้ง)', 'Reverse (stackable, reverses once each)'], ['ข้ามตา (ลงซ้อนได้)', 'Skip (stackable)'],
    ['ข้ามทุกคน (เล่นต่อ)', 'Skip everyone (play again)'], ['พลิกด้านการ์ดทั้งหมด', 'Flip every card'], ['เปลี่ยนสี', 'Change color'], ['เรียนรู้', 'Learn'],
    ['โหมดทดลองเล่นคนเดียว (เล่นกับบอท)', 'Solo test mode (play vs bots)'], ['เครื่องนี้:', 'This machine:'], ['เพื่อนในออฟฟิศ:', 'Coworkers:']
  ];
  // ภาษาไทยล้วน: แทนคำอังกฤษที่โผล่ในข้อความ
  const T = [['Skip Everyone', 'ข้ามทุกคน'], ['Wild Draw Color', 'ไวลด์จั่วสี'], ['Wild', 'ไวลด์'], ['Flip', 'พลิก'], ['Pause', 'หยุด'], ['Resume', 'เล่นต่อ']];

  const THAI = /[฀-๿]/;
  const mk = (list) => {
    const m = new Map(); list.forEach(([a, b]) => m.set(a, b));
    const keys = [...m.keys()].sort((a, b) => b.length - a.length);
    const src = keys.map((k) => {
      const e = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return k.replace(/[^ก-๙]/g, '').length && k.length <= 3 && THAI.test(k) ? '(?<![ก-๙])' + e + '(?![ก-๙])' : e;
    }).join('|');
    return { m, re: new RegExp(src, 'g') };
  };
  const EN = mk(P);
  const TH = { m: new Map(T), re: new RegExp(T.map((x) => x[0]).sort((a, b) => b.length - a.length).join('|'), 'g') };

  let lang = 'th'; try { lang = localStorage.getItem('ofc_lang') === 'en' ? 'en' : 'th'; } catch (e) { /* */ }
  const cache = new Map();
  const tx = (s, exactOnly) => {
    if (!s) return s;
    if (lang === 'en') {
      const t = s.trim();
      if (!THAI.test(t)) return s;
      if (EX[t] !== undefined) return s.replace(t, EX[t]);
      if (exactOnly) { const mm = /^(.*?)( \(คุณ\)| · ชนะ \d+)?$/.exec(t), sf = (mm[2] || '').replace('คุณ', 'you').replace('ชนะ', 'wins'), m = EN.m.get(mm[1]); return m !== undefined ? s.replace(t, m + sf) : (sf ? s.replace(t, mm[1] + sf) : s); }
      const key = s; let r = cache.get(key); if (r !== undefined) return r;
      r = s.replace(EN.re, (x) => EN.m.get(x)); if (cache.size > 4000) cache.clear(); cache.set(key, r); return r;
    }
    if (exactOnly) return s;
    return /[A-Za-z]/.test(s) ? s.replace(TH.re, (x) => TH.m.get(x)) : s;
  };
  const orig = new WeakMap(), last = new WeakMap(), aOrig = new WeakMap();
  const skip = (n) => { const p = n.parentElement; return !p || p.closest('script,style,textarea') ; };
  function doText(n) {
    if (skip(n)) return;
    const cur = n.nodeValue; let o = orig.get(n);
    if (o === undefined || cur !== last.get(n)) { o = cur; orig.set(n, o); }
    const p = n.parentElement;
    const out = tx(o, !!(p && p.closest('[data-nt]')));
    last.set(n, out); if (out !== cur) n.nodeValue = out;
  }
  function doAttr(el, a) {
    if (!el.hasAttribute || !el.hasAttribute(a)) return;
    let rec = aOrig.get(el); if (!rec) { rec = {}; aOrig.set(el, rec); }
    const cur = el.getAttribute(a), r = rec[a];
    if (!r || cur !== r.out) rec[a] = { o: cur, out: cur };
    const out = tx(rec[a].o, false); rec[a].out = out; if (out !== cur) el.setAttribute(a, out);
  }
  function walk(root) {
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    if (root.matches && root.matches('script,style')) return;
    doAttr(root, 'placeholder'); doAttr(root, 'title');
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n; while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else { doAttr(n, 'placeholder'); doAttr(n, 'title'); } }
  }
  function docTitle() { const t = document.querySelector('title'); if (t && t.firstChild) doText(t.firstChild); }
  function full() { cache.clear(); walk(document.documentElement); docTitle(); }
  const mo = new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttr(m.target, m.attributeName);
      else m.addedNodes.forEach(walk);
    }
  });
  function start() {
    full();
    mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title'] });
    document.documentElement.lang = lang === 'en' ? 'en' : 'th';
  }
  window.I18N = {
    get lang() { return lang; },
    set(l) { lang = l === 'en' ? 'en' : 'th'; try { localStorage.setItem('ofc_lang', lang); } catch (e) { /* */ } document.documentElement.lang = lang; full(); document.dispatchEvent(new Event('langchange')); },
    tx
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

# Pocket Sync 인수인계

기준 2026-10-05. 새 Claude 계정이나 새 세션에서는 이 문서를 먼저 읽고 이어서 작업합니다.

## 보안 원칙 (반드시 지킬 것)
- 허용 계정 이메일은 저장소에 절대 넣지 않습니다. 저장소에는 SHA-256 해시만 둡니다(`src/seat-hashes.json`).
- 실제 이메일은 Firebase 콘솔의 Firestore 규칙에만 있습니다. `firestore.rules.example`은 자리표시자(EMAIL_LHS 등)입니다.
- 내보낸 기록 파일(전체 기록 JSON)은 공개된 곳에 올리지 않습니다.
- 이 저장소는 공개이고, GitHub Pages가 저장소 파일을 그대로 서비스합니다.

## 한눈에
- 주소: https://pocketlhs-dotcom.github.io/pocketsync/ (GitHub Pages, main 브랜치 루트, `.nojekyll`)
- 저장소: pocketlhs-dotcom/pocketsync (공개)
- 기록·로그인: Firebase 프로젝트 `pocketsync-64cd6`(Spark 무료). Firestore + Google 로그인.
- 보드 3개 (괄호는 자리 id)
  - A: 이현성(lhs) · 권중선(kjs)
  - B: 이현성(lhs) · 정규진(jgj)
  - C: 이현성(lhs, 관리) + 디자인팀 강승연(ksy) · 안은지(aej)
- 보드 전환 이름: "A 보드 : 권중선", "B 보드 : 정규진", "C 보드 : 디자인팀"(모바일은 이름만).

## 새 계정·새 세션에서 이어가기
1. 새 Claude 계정에서 GitHub를 연결하고 이 저장소를 고릅니다. 같은 GitHub 계정(pocketlhs-dotcom)으로 승인하거나, 다른 GitHub 계정이면 저장소 Settings > Collaborators에서 쓰기 권한으로 추가합니다.
2. 저장소 소유권 이전(transfer)은 권장하지 않습니다. 사이트 주소가 새 소유자 주소로 바뀌고 예전 Pages 주소는 자동으로 넘어가지 않습니다. 이전한다면 Firebase 콘솔 > Authentication > 설정 > 승인된 도메인에 새 주소를 넣어야 로그인이 되고, 이미 보낸 외부 공유 링크는 새 주소로 다시 보내야 합니다.
3. Firebase 콘솔은 Claude가 직접 다루지 않습니다. 규칙 게시는 이현성이 콘솔에서 합니다. 다른 구글 계정이 콘솔을 관리해야 하면 프로젝트 설정 > 사용자 및 권한에서 구성원으로 추가합니다.
4. 첫 요청 예: "저장소의 HANDOVER.md를 읽고 이어서 작업해줘."

## 수정·배포
- `src/` 편집 → `sh build.sh` → `index.html`, `app.js`, `platform.js` 생성 → 빌드 결과까지 커밋 → main에 push(1~2분 뒤 반영).
- `app.js` = `src/icons.js` + `src/part2-core.js` + `src/part3-app.js` + `src/part4-team.js` (Preact + htm, 번들러 없음).
- `platform.js` = `src/platform-firebase.js` (빌드 때 `__SEAT_HASHES__` 자리에 `src/seat-hashes.json`이 들어감).
- `index.html` = `src/part1-head.html`(스타일 전부) + 스크립트 태그.
- `vendor/`: Preact 10.29.8, htm 3.1.1, Firebase compat 10.14.1.
- 진입점: `src/part4-team.js` 끝의 `AppRoot`가 C 보드면 `TeamBoard`, 아니면 `Board`(part3)를 띄웁니다. 외부 공유 링크(`?share=토큰`)는 `ShareView`.

## 플랫폼 층 (src/platform-firebase.js)
- 구글 로그인 → 이메일 SHA-256 → 자리(seat). 이름 `SEAT_NAMES`, 보드 구성 `BOARDS`, 자리별 보드 `SEAT_BOARDS`.
- 보드 선택: localStorage `ps.board` + 새로고침.
- db 래퍼: 저장할 때 `board` 필드를 자동으로 넣고, 목록은 `where('board','in',VISIBLE)`로 읽습니다. `visibleFor`: A·B = [보드, 'all'], C = ['C'](디자이너는 'all'을 보지 못함).
- 이전 루틴: lhs·kjs 로그인 때만 실행(meta/boards_v2, meta/checkin_v2). lhs만 개발 카테고리 공유(meta/share_dev_v1). B 첫 사용 시 카테고리 시드(meta/seed_B).
- C와 A·B 연결 동기화: 이현성 클라이언트에서만 `watchTeamLinks`가 C 업무를 구독해 A·B 원본 문서에 `c_link`(상태·진행률·담당·마감·특이사항)를 씁니다(캐시 localStorage `ps.clink`). 디자이너는 A·B에 쓸 수 없기 때문입니다.
- 실시간 구독만 씁니다(주기 재조회 없음, 무료 읽기 한도 보호).

## Firestore 규칙 요약 (firestore.rules.example)
- `boards()`: 이현성 ['A','B','C','all'], 권중선 ['A','all'], 정규진 ['B','all'], 강승연·안은지 ['C'].
- `shares/{token}`: get 누구나(외부 공유 링크).
- 그 밖의 모든 컬렉션: 멤버이고 (문서가 없거나 board가 boards() 안) 이면 읽기. 생성·수정·삭제도 board를 검사합니다.
- 사람 추가 절차: (1) 이메일(소문자)의 SHA-256을 `src/seat-hashes.json`에 자리 id로 추가 (2) `SEAT_NAMES`·`BOARDS`·`SEAT_BOARDS` 수정 (3) 빌드·push (4) 이현성이 콘솔 규칙 `boards()`에 실제 이메일을 넣고 게시.

## 데이터
- 컬렉션: topics(카테고리), items(기록), comments, acks, reactions, profiles, members, checkins(오늘의 나), presence(지금 상태), seen(새 소식), daynotes, shares(외부 공유), avatars(C 프로필 이미지). 모든 문서에 `board`('A'|'B'|'C'|'all').
- items.kind: event(일정) / daily(전할 말) / task(업무).
- 업무 공통 필드: status, assignee, due, priority, progress, checklist[{id,text,pct,done,by,at}], prio_no(수동 순서, 0=없음), links, done_at. A·B 원본이 C와 연결되면 `c_link`.
- 댓글 `marks`: {check:[이름], like:[이름]} (확인·좋아요, 누른 사람 표시).
- C 전용
  - 담당 여러 명은 이름을 '·'로 연결. '모두' = 셋 다, 예전 '함께' = 디자이너 둘, '' = 미배정.
  - spec = 요청 세부 업무(업무 자세히 보기용, 처음 등록할 때 입력). checklist = 실무자 세부 업무(by = 실무자, at = 작성일).
  - start_on(착수 예정일), issue + issue_log(해결 기록, 최대 50), history(업무 기록, 최대 200).
  - src_id·src_board·src_*(A 원본 연결), out_links(A·B로 보낸 업무).
  - 확인 요청은 team_type 'ask', 업무보고는 team_type 'report'(문서 id `C-rep-자리-날짜`).

## 화면
### A·B 보드 (src/part3-app.js)
- 탭: 오늘의 공유 / 확인 요청 / 서로의 스케줄 / 함께하는 일 / 주간 회의 / 완료.
- 기록 종류: 일정(시간이 있는 것), 업무(끝까지 챙길 일), 전할 말(상대에게 전하는 말, 확인 요청 옵션).
- 서로의 스케줄: 사람별 업무 목록(수동 순위 다음 자동 점수), 요청받은 일(맡을게요/어려워요), 오늘·내일 할 일(plan_day), 세부 업무(실무자 여러 명·작성일), 완료한 일 묶음, 설명 첫 줄 표시. Figma(Design-Team 12240:3) 기준 스타일.
- 그 밖: 오늘의 나, 지금 상태, 새 소식, 컴퓨터 알림, 검색, 외부 공유 링크(보드 전체 / 업무 현황), 카테고리를 다른 보드에 보기 전용으로 공유.
- C와 연결된 업무에는 "디자인팀 진행 중 60%" 태그(CLinkTag, 특이사항 있으면 느낌표).
- 마감 빠른 선택의 '모레'는 +2일. D-day 당일 표기는 '오늘'.

### C 디자인팀 보드 (src/part4-team.js)
- 탭: 팀 현황 / 오더 / 마감 / 확인 요청 및 특이사항 / 오늘의 업무보고 / 완료.
- 팀 현황: 특이사항 알림 + [업무 리스트 | 사람 카드 3장(프로필 이미지 변경 가능)].
  - 업무 리스트: 사람 필터, 한 줄 추가, 상태 탭(진행 중·예정·보류·완료·남은 일 전체, 기본 진행 중), 상태 배지 바로 변경, 담당 버튼(이현성/강승연/안은지, 여러 명), D-day 눌러 마감 변경, 세부 업무 펼치기, 끌어서 순서(완료 탭 제외).
  - 불러오기·추가 뒤에는 예정 탭으로 전환.
  - 정렬: 수동 순서가 없는 업무가 위(최신순), 그다음 순서 번호 순.
- A에서 불러오기: 전체/선택, 완료 포함, 카테고리 칩, 담당 지정, 맨 위 '새로 만들기' 줄. 원본 연결 유지(세부 업무·링크 복사).
- 상세: 담당(여러 명·미배정·셋 다), 마감, 중요도, 상태, 착수 예정(예정 상태일 때), 진행률, 특이사항, 링크, 세부 업무, 댓글(확인·좋아요, 수정·삭제), 업무 기록 타임라인(같은 사람의 10분 안 연속 변경은 합침).
- '업무 자세히 보기': 내용(바로 수정), 요청 세부 업무(spec), A 원본(다를 때만), 링크 모음.
- 이현성만 보는 것: '다른 보드 연결'(접힘) — A·B로 보내기, 연결 끊기. 디자이너는 'A 보드 원본: 제목' 한 줄만.
- 인수인계 메모 기능은 10-02에 삭제(세부 업무 실무자 표시로 대체). 예전 메모는 업무 기록의 '메모' 버튼으로만 보입니다.

## 사용자 선호·결정
- 보고: "요청사항 - 결과" 형식, 진행 피드백 최소, 이모지 금지. 결정이 갈리면 물어보고 진행.
- 디자인: 작은 컨트롤 모서리 3px 통일, 상태 색 점 쓰지 않음, Pretendard 폰트, lucide 아이콘.
- C 운영: 오더 탭은 팀 현황과 합치지 않고 유지, 요약 숫자(KPI) 칸 제거, 업무보고는 한 줄 입력 + "오늘 손댄 업무" 넣기, 업무 리스트 담당 버튼에 '셋 다' 없음.
- 프로필 이미지는 C 보드만(A·B는 요청 시).

## 검증 방법
- Playwright + Chromium으로 가짜 Firebase(메모리 Firestore·Auth)를 끼워 데스크톱 1440 / 모바일 390에서 열어 확인해 왔습니다.
- 그 테스트 파일은 실제 이메일이 들어 있어 저장소에 넣지 않았고 이전 세션의 임시 폴더에만 있었습니다. 새 세션에서는 테스트용 이메일을 쓰고 `platform.js`의 해시를 바꿔 끼우는 방식으로 다시 만듭니다.

' PhotoCafe 인쇄 에이전트 백그라운드 실행
' 콘솔 창 없이 실행 — 시작프로그램 등록용
' 스크립트 자신의 폴더 기준으로 경로 자동 계산
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
agentPath = scriptDir & "\print-agent.js"
WshShell.Run "node """ & agentPath & """", 0, False

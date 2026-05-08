' PhotoCafe 인쇄 에이전트 — 자동 재시작 루프 (중복 실행 방지 포함)
' 에이전트(node)가 종료되면 5초 후 자동으로 다시 시작합니다.
' 작업 스케줄러에 등록하여 로그인 시 백그라운드로 실행하세요.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 이 vbs 파일과 같은 폴더의 print-agent.js 를 실행
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
agentPath = scriptDir & "\print-agent.js"

' node.exe 경로 탐색 (작업 스케줄러는 PATH가 제한되므로 전체 경로 우선)
Function FindNodeExe()
    Dim candidates(4)
    candidates(0) = "C:\Program Files\nodejs\node.exe"
    candidates(1) = "C:\Program Files (x86)\nodejs\node.exe"
    candidates(2) = WshShell.ExpandEnvironmentStrings("%APPDATA%") & "\nvm\current\node.exe"
    candidates(3) = WshShell.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe"
    candidates(4) = "node"
    Dim i
    For i = 0 To 3
        If fso.FileExists(candidates(i)) Then
            FindNodeExe = candidates(i)
            Exit Function
        End If
    Next
    FindNodeExe = "node"
End Function

Dim nodePath
nodePath = FindNodeExe()

If Not fso.FileExists(agentPath) Then
    WshShell.Popup "print-agent.js 파일을 찾을 수 없습니다." & vbCrLf & agentPath, 10, "PhotoCafe 에이전트 오류", 16
    WScript.Quit 1
End If

' ── 중복 실행 방지: 기존 print-agent.js 프로세스 종료 ──────────────────
Sub KillExistingAgent()
    Dim objWMI, colProcs, objProc
    Set objWMI = GetObject("winmgmts:\\.\root\cimv2")
    Set colProcs = objWMI.ExecQuery("SELECT * FROM Win32_Process WHERE Name = 'node.exe'")
    For Each objProc In colProcs
        If InStr(LCase(objProc.CommandLine), "print-agent.js") > 0 Then
            objProc.Terminate()
        End If
    Next
End Sub
' ────────────────────────────────────────────────────────────────────────

' 시작 전 기존 프로세스 정리 (포트 충돌 방지)
KillExistingAgent()
WScript.Sleep 1000

Do
    ' 0 = 창 숨김, True = 종료될 때까지 대기
    WshShell.Run """" & nodePath & """ """ & agentPath & """", 0, True
    ' 에이전트가 꺼지면 기존 잔여 프로세스 정리 후 5초 뒤 재시작
    KillExistingAgent()
    WScript.Sleep 5000
Loop

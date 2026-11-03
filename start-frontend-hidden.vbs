Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = "H:\hqnatex\frontend"
shell.Run "cmd.exe /c H:\hqnatex\frontend\start-hqnatex-frontend.cmd", 0, False

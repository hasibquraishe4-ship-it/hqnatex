Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = "H:\hqnatex\core"
shell.Run "cmd.exe /c H:\hqnatex\core\start-hqnatex-core.cmd", 0, False

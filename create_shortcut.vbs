Set objShell = CreateObject("WScript.Shell")
strDesktop = objShell.SpecialFolders("Desktop")
strCurrentDir = objShell.CurrentDirectory

Set objShortcut = objShell.CreateShortcut(strDesktop & "\应用易控服务器.lnk")
objShortcut.TargetPath = "cmd.exe"
objShortcut.Arguments = "/c " & Chr(34) & strCurrentDir & "\start.bat" & Chr(34)
objShortcut.WorkingDirectory = strCurrentDir
objShortcut.IconLocation = "imageres.dll,67"
objShortcut.Description = "启动应用易控服务器"
objShortcut.Save

WScript.Echo "快捷方式已创建到桌面！"

@echo off
echo Building XmlXslReader (without console)...
go build -ldflags="-H windowsgui" -o build/XmlXslReader.exe
if %errorlevel% equ 0 (
    echo Build successful: build\XmlXslReader.exe
) else (
    echo Build failed!
)

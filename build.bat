REM windows build
REM (I hate batch files)

clang -o tgt\sink.exe -fwrapv -O2 src\cmd.c src\sink_shell.c src\sink.c

cd src
tsc
cd ..

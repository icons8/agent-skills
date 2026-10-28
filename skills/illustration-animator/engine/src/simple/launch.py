# Runs one script of the simple-animation module with the module's folders on the python path, the cairosvg stand-in
# behind the real packages and the node modules folder known to the child processes (check.py starts node):
#   python launch.py --scripts <dir> [--shim <dir>] [--node-modules <dir>] -- <script.py> [args...]
import os
import runpy
import sys


def main():
    argv = sys.argv[1:]
    cut = argv.index('--')
    opts, rest = argv[:cut], argv[cut + 1:]
    given = {opts[i]: opts[i + 1] for i in range(0, len(opts) - 1, 2)}
    script = os.path.abspath(rest[0])
    paths = [os.path.dirname(script), given['--scripts']]
    if '--shim' in given:
        paths.insert(0, given['--shim'])
    sys.path[:0] = paths
    if '--node-modules' in given:
        os.putenv('NODE_PATH', given['--node-modules'])
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding='utf-8')
    sys.argv = [script] + rest[1:]
    runpy.run_path(script, run_name='__main__')


main()

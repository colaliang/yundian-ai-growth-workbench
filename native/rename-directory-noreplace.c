#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <sys/prctl.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <unistd.h>
#include <linux/fs.h>
/* Literal absolute paths only. No shell, fallback, traversal or filesystem copy. */
int main(int argc, char **argv) {
    struct stat source;
    if (argc != 4 || argv[1][0] != '/' || argv[2][0] != '/') return 64;
    char *end;
    long parent = strtol(argv[3], &end, 10);
    if (*end || parent <= 1 || prctl(PR_SET_PDEATHSIG, SIGKILL) != 0 || getppid() != parent) return 70;
    if (lstat(argv[1], &source) != 0 || !S_ISDIR(source.st_mode)) return 65;
    if (syscall(SYS_renameat2, AT_FDCWD, argv[1], AT_FDCWD, argv[2], RENAME_NOREPLACE) == 0) return 0;
    int error = errno;
    fprintf(stderr, "renameat2 errno=%d\n", error);
    if (error == EEXIST) return 17;
    if (error == ENOSYS || error == EINVAL || error == EOPNOTSUPP) return 69;
    return 74;
}


# JukeBox1

Legacy Qt3/X11 music-player interface with keyboard controls and optional kiosk hardware support.

## Current changes

The parallel-port dependency is disabled for desktop use. The application no longer calls `ioperm()`, `inb()`, or `outb()`, so it can run without an LPT port. Keyboard controls remain available:

- `F1`: add credits
- `Up` / `Down`: select a track
- `Enter`: play
- `Esc`: stop
- `Q`: quit
- `H`: invokes `/sbin/halt`; do not use it on a development machine

Music files and other large media are not included in this repository. Put MP3 files in `defaults/music` or configure another music directory in `conf.xml`.

## WSL2 build

The original program is an ELF32 i386 Qt3 application. Alpine WSL2 can run it through a small Debian Squeeze i386 compatibility sysroot and `qemu-i386`.

Install the Alpine host tools:

```sh
apk add qemu-i386 debootstrap dpkg proot binutils file mplayer xdotool \
  alsa-plugins-pulse pulseaudio-alsa
ln -sf /usr/bin/mplayer /usr/local/bin/mplayer
printf '%s\n' 'pcm.!default { type pulse server unix:/mnt/wslg/PulseServer }' \
  | tee /etc/asound.conf >/dev/null
```

Create the compatibility sysroot:

```sh
debootstrap --arch=i386 --foreign --variant=minbase --no-check-gpg \
  squeeze /opt/jb-squeeze http://archive.debian.org/debian
chroot /opt/jb-squeeze /debootstrap/debootstrap --second-stage
chroot /opt/jb-squeeze env DEBIAN_FRONTEND=noninteractive \
  apt-get -o Acquire::Check-Valid-Until=false \
  -o APT::Get::AllowUnauthenticated=true update
chroot /opt/jb-squeeze env DEBIAN_FRONTEND=noninteractive \
  apt-get -o Acquire::Check-Valid-Until=false \
  -o APT::Get::AllowUnauthenticated=true install -y \
  qt3-dev-tools libqt3-headers libqt3-mt libxine-dev libxine1-bin \
  mplayer alsa-utils libstdc++5 build-essential libx11-dev libxext-dev
```

Copy this project into the sysroot, then build it:

```sh
cp -a /mnt/c/path/to/JukeBox1 /opt/jb-squeeze/root/JukeBox1
chroot /opt/jb-squeeze /usr/bin/qmake \
  -o /root/JukeBox1/Makefile /root/JukeBox1/jukebox.pro
chroot /opt/jb-squeeze /usr/bin/make -C /root/JukeBox1
```

Run it with WSLg:

```sh
wsl -d Alpine --cd /opt/jb-squeeze/root/JukeBox1 -- \
  /usr/bin/env DISPLAY=:0 \
  XDG_RUNTIME_DIR=/mnt/wslg/runtime-dir \
  PULSE_SERVER=unix:/mnt/wslg/PulseServer \
  /usr/bin/qemu-i386 -L /opt/jb-squeeze \
  /opt/jb-squeeze/root/JukeBox1/jukebox
```

The sysroot and installed packages are local compatibility infrastructure and are not part of the repository.

## Debian WSL2 installation

Install Debian WSL from PowerShell if it is not installed:

```powershell
wsl --install -d Debian
```

Open the Debian WSL shell and install the host tools:

```sh
sudo apt update
sudo apt install -y debootstrap qemu-user binutils file proot mplayer \
  libasound2-plugins pulseaudio-utils tmux xdotool
sudo ln -sf /usr/bin/mplayer /usr/local/bin/mplayer
printf '%s\n' 'pcm.!default { type pulse server unix:/mnt/wslg/PulseServer }' \
  | sudo tee /etc/asound.conf >/dev/null
```

Create the 32-bit compatibility sysroot:

```sh
sudo debootstrap --arch=i386 --foreign --variant=minbase --no-check-gpg \
  squeeze /opt/jb-squeeze http://archive.debian.org/debian
sudo chroot /opt/jb-squeeze /debootstrap/debootstrap --second-stage
sudo chroot /opt/jb-squeeze env DEBIAN_FRONTEND=noninteractive \
  apt-get -o Acquire::Check-Valid-Until=false \
  -o APT::Get::AllowUnauthenticated=true update
sudo chroot /opt/jb-squeeze env DEBIAN_FRONTEND=noninteractive \
  apt-get -o Acquire::Check-Valid-Until=false \
  -o APT::Get::AllowUnauthenticated=true install -y \
  qt3-dev-tools libqt3-headers libqt3-mt libxine-dev libxine1-bin \
  mplayer alsa-utils libstdc++5 build-essential libx11-dev libxext-dev
```

Copy this repository from the Windows filesystem and build it:

```sh
sudo cp -a /mnt/c/path/to/JukeBox1 /opt/jb-squeeze/root/JukeBox1
sudo chroot /opt/jb-squeeze /usr/bin/qmake \
  -o /root/JukeBox1/Makefile /root/JukeBox1/jukebox.pro
sudo chroot /opt/jb-squeeze /usr/bin/make -C /root/JukeBox1
```

Run it with WSLg:

```sh
wsl -d Debian --cd /opt/jb-squeeze/root/JukeBox1 -- \
  /usr/bin/env LANG=C LC_ALL=C DISPLAY=:0 \
  XDG_RUNTIME_DIR=/run/user/0 \
  PULSE_SERVER=unix:/mnt/wslg/PulseServer \
  /usr/bin/qemu-i386 -L /opt/jb-squeeze \
  /opt/jb-squeeze/root/JukeBox1/jukebox
```

The LPT-free build uses the keyboard controls listed above. The `H` shortcut still invokes `/sbin/halt` and should not be pressed on a development machine.

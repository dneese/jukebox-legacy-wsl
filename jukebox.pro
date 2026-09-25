TEMPLATE	= app
LANGUAGE	= C++

CONFIG	+= qt warn_on release

LIBS	+= -lxine

HEADERS	+= pixmaps.h \
	hint.h

SOURCES	+= main.cpp

FORMS	= jukebox.ui \
	syncoutput.ui

unix {
  UI_DIR = .ui
  MOC_DIR = .moc
  OBJECTS_DIR = .obj
}




#include <qapplication.h>
#include "jukebox.h"

int main( int argc, char ** argv )
{
    QApplication a( argc, argv );
    jukebox w;
    w.show();
    a.connect( &a, SIGNAL( lastWindowClosed() ), &a, SLOT( quit() ) );
    return a.exec();
}

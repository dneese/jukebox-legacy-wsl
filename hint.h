#ifndef HINT_H
#define HINT_H

#include <qlabel.h>

class Hint : public QLabel
{
	public:
		Hint() : QLabel(0, "hint", WStyle_Customize | WStyle_NoBorder | WStyle_StaysOnTop | WX11BypassWM) {}
		virtual ~Hint() {}
};

#endif

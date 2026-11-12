#ifndef CIRCULAR_BUFFER_H
#define CIRCULAR_BUFFER_H

#include <stddef.h>

template<typename T, size_t Size>
class CircularBuffer {
private:
    T buffer[Size];
    size_t head = 0;
    size_t tail = 0;
    size_t count = 0;

public:
    bool push(const T& item) {
        if (count >= Size) return false;
        buffer[head] = item;
        head = (head + 1) % Size;
        count++;
        return true;
    }

    bool pop(T& item) {
        if (count == 0) return false;
        item = buffer[tail];
        tail = (tail + 1) % Size;
        count--;
        return true;
    }

    bool peek(T& item) const {
        if (count == 0) return false;
        item = buffer[tail];
        return true;
    }

    size_t size() const { return count; }
    bool empty() const { return count == 0; }
    bool full() const { return count >= Size; }
    void clear() { head = tail = count = 0; }
};

#endif

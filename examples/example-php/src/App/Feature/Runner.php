<?php

namespace App\Feature;

use App\Base\BaseRunner;
use App\Contracts\Runnable;
use App\Model\User;

class Runner extends BaseRunner implements Runnable {
    public function run(User $user): string {
        return $user->name;
    }
}

function boot(): Runner {
    return new Runner();
}
